require('dotenv').config(); // Carga las variables del .env
const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Esto le dice a Express que sirva los archivos de la carpeta 'WebPage'
app.use(express.static(path.join(__dirname, 'WebPage')));

// 1. Inicialización con Firebase
// Soporta dos modos:
//   - Producción (Railway/Render): variable FIREBASE_KEY_BASE64 con el JSON en base64
//   - Local/Docker:                variable FIREBASE_SERVICE_ACCOUNT_PATH con la ruta al archivo
let serviceAccount;
if (process.env.FIREBASE_KEY_BASE64) {
  // Modo nube: decodifica el JSON desde la variable de entorno
  serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_KEY_BASE64, 'base64').toString('utf8')
  );
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  // Modo local: carga el archivo directamente
  serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
} else {
  console.error('ERROR: Debes definir FIREBASE_KEY_BASE64 o FIREBASE_SERVICE_ACCOUNT_PATH');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();
const cors = require('cors');
app.use(cors());

// 2. Endpoint que recibe los datos del ESP32
app.post('/api/sensor', async (req, res) => {
    const { nivel, limite } = req.body;

    try {
        const updates = {};
        
        if (nivel !== undefined) {
            // Actualiza nivel actual 
            updates['/sensor/nivel'] = nivel;
            
            // Crea una nueva entrada en el historial con timestamp del servidor 
            const nuevoHistorialRef = db.ref('/sensor/historial').push();
            updates[`/sensor/historial/${nuevoHistorialRef.key}`] = {
                valor: nivel,
                timestamp: admin.database.ServerValue.TIMESTAMP
            };
        }

        if (limite !== undefined) {
            // Actualiza el límite 
            updates['/sensor/limite'] = limite;
        }

        await db.ref().update(updates);
        res.status(200).send({ status: "Datos sincronizados con Firebase" });
        
    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).send({ error: "Error al guardar en base de datos" });
    }
});


app.get('/api/dashboard', async (req, res) => {
    try {
        // Obtenemos los últimos 10 del historial
        const snapshot = await db.ref('/sensor/historial').limitToLast(10).once('value');
        const limiteSnapshot = await db.ref('/sensor/limite').once('value');
        
        const data = snapshot.val() || {};
        const limite = limiteSnapshot.val() || 0;

        // Formateamos los datos para que el script.js no tenga que trabajar tanto
        const historial = Object.keys(data).map(key => ({
            valor: data[key].valor,
            timestamp: data[key].timestamp
        }));

        res.status(200).json({ historial, limite });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos" });
    }
});

// Endpoint para el PDF (últimos 50)
app.get('/api/reporte', async (req, res) => {
    try {
        const snapshot = await db.ref('/sensor/historial').limitToLast(50).once('value');
        res.status(200).json(snapshot.val());
    } catch (error) {
        res.status(500).json({ error: "Error en reporte" });
    }
});

// 3. Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor IoT activo en puerto ${PORT}`);
});
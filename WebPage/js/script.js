let limiteActual = 0; 
const SERVER_URL = "http://localhost:3000"; 
const suelocm = 7; 

// Configuración de la Gráfica 
const ctx = document.getElementById('floodChart').getContext('2d');

const floodChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], 
        datasets: [{
            label: 'Nivel (cm)',
            data: [],
            borderColor: '#1155ea',
            backgroundColor: 'rgba(37, 100, 235, 0.3)',
            fill: true,
            tension: 0.5
        }]
    },
    options: { responsive: true, maintainAspectRatio: false }
});

// FUNCIÓN PRINCIPAL DE CONSULTA (Polling)
async function actualizarDashboard() {
    try {
        const response = await fetch(`${SERVER_URL}/api/dashboard`);
        const { historial, limite } = await response.json();
        
        limiteActual = limite;
        const SueloSensor1 = suelocm;
        
        if (historial && historial.length > 0) {
            const labels = [];
            const values = [];

            historial.forEach(lectura => {
                const fecha = new Date(lectura.timestamp);
                const hora = `${fecha.getHours()}:${String(fecha.getMinutes()).padStart(2, '0')}:${String(fecha.getSeconds()).padStart(2, '0')}`;
                
                let waterLevel = SueloSensor1 - lectura.valor; 
                labels.push(hora);
                values.push(waterLevel);
            });

            // Actualizar Gráfica
            floodChart.data.labels = labels;
            floodChart.data.datasets[0].data = values;
            floodChart.update();

            // Actualizar UI con el último valor
            const ultimoValor = values[values.length - 1];
            analizarComportamiento(values);
            actualizarUI(ultimoValor);
        }
    } catch (error) {
        console.error("Error al conectar con el servidor:", error);
    }
}

function analizarComportamiento(values) {
    if (values.length < 2) return "Esperando más datos...";

    const primero = promedio(values.slice(0, Math.floor(values.length/2)));
    const ultimo = promedio(values.slice(Math.floor(values.length/2)));
    const diferencia = primero - ultimo;
    const desviacion = desviacionEstandar(values);

    let resumen = "";

    if (desviacion > 2) {
        resumen = "Comportamiento inestable: fluctuaciones fuertes en el nivel de agua.";
    } else if (Math.abs(diferencia) <= 1) {
        resumen = "Estado estable: sin cambios significativos.";
    } else if (diferencia < 0) {
        resumen = `Tendencia al alza: el nivel subió ~${Math.abs(diferencia).toFixed(2)} cm.`;
    } else {
        resumen = `Tendencia a la baja: el nivel bajó ~${Math.abs(diferencia).toFixed(2)} cm.`;
    }

    const resumenElement = document.getElementById('resumenComportamiento');
    if (resumenElement) resumenElement.innerText = resumen;

    return resumen;
}


function promedio(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}


function desviacionEstandar(arr) {
  const mean = promedio(arr);
  const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function mediana(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function actualizarUI(realValue) {
    console.log("Dato recibido:", realValue);

    // A. Actualizar Texto
    const distElement = document.getElementById('distText');
    if(distElement) distElement.innerText = realValue + " cm";

    // B. Lógica de la Barra de Agua 
    const SueloSensor = suelocm;
    let waterLevel = realValue; 
    const proporcion = 100/SueloSensor;
    waterLevel = Math.max(0, Math.min(30, waterLevel)); 
    waterLevel = parseInt(waterLevel * proporcion);
    
    const waterBar = document.getElementById('waterBar');
    if(waterBar) waterBar.style.height = waterLevel + '%';

    // C. Lógica de Peligro
    const dangerBar = document.getElementById('dangerBar');
    if(dangerBar) {
        const SueloDanger = SueloSensor - limiteActual; 
        let DangerLevel = realValue; 
        const proporcionDanger = 100/SueloDanger;
        DangerLevel = parseInt(DangerLevel * proporcionDanger);
        
        let mensajes;
        if (DangerLevel < 45){
            dangerBar.style.background = "linear-gradient(to top, #14e29d, #1fbf84)";
            mensajes = "El nivel del agua es bajo, no requiere acciones.";
        } else if (DangerLevel < 80) {
            dangerBar.style.background = "linear-gradient(to top, #facb53, #fcaa4d)";
            mensajes = "El nivel del agua está subiendo, manténgase atento.";
        } else {
            dangerBar.style.background = "linear-gradient(to top, #e65858, #c91c1c)";
            mensajes = "El nivel del agua es peligroso, evacue de inmediato.";
        }

        const mensajesP = document.getElementById('mensajesText');
        if(mensajesP) mensajesP.textContent = mensajes;
        dangerBar.style.height = DangerLevel + '%';
    }
}

// Ejecutar cada 5 segundos
setInterval(actualizarDashboard, 5000);
actualizarDashboard(); // Carga inicial

// Ajuste para el PDF
async function exportarReportePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(17, 85, 234); 
    doc.text("REPORTE DE MONITOREO - IoT ESP32 - HC SR04", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 20, 30);
    doc.text("Base de Datos: Firebase", 20, 37);
    
    const response = await fetch(`${SERVER_URL}/api/reporte`);
    const data = await response.json();
    
    if (data) {
        let yPos = 55;
        doc.setFont("helvetica", "bold");
        doc.text("Hora de Lectura", 25, 50);
        doc.text("Nivel Detectado (cm)", 80, 50);
        doc.setFont("helvetica", "normal");

        Object.keys(data).forEach((key, index) => {
            const lectura = data[key];
            const hora = new Date(lectura.timestamp).toLocaleTimeString();
            let nivelAguaExpo = suelocm - lectura.valor;
            doc.text(hora, 25, yPos);
            doc.text(`${nivelAguaExpo} cm`, 85, yPos);
            
            yPos += 8; // Espaciado entre filas

            // Crear página nueva si el reporte es muy largo
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
        });

        // Guardar el archivo
        doc.save(`Reporte_${Date.now()}.pdf`);
    }else {
        alert("No hay datos disponibles para exportar.");
    }
}
document.getElementById('btnExportar').addEventListener('click', exportarReportePDF);

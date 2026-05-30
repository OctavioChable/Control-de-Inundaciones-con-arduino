# Arduino IoT Server

Servidor Node.js con Express y Firebase para recibir datos de sensores ESP32/Arduino.

## Estructura

```
Arduino-server/
├── Esp32Arduino.js        # Servidor principal
├── WebPage/               # Frontend estático
│   ├── index.html
│   ├── css/estilos.css
│   └── js/script.js
├── keys/                  
│   └── iotKey.json        # Credenciales Firebase (agregar manualmente)
├── Dockerfile
├── docker-compose.yml
├── .env.example           # Plantilla de configuración
└── package.json
```

## Configuración inicial

1. Copia `.env.example` a `.env` y llena tus valores:
   ```bash
   cp .env.example .env
   ```

2. Coloca tu archivo de credenciales de Firebase en `keys/iotKey.json`

## Ejecutar con Docker

```bash
# Construir imagen
docker build -t arduino-server .

# Ejecutar (requiere .env y carpeta keys/)
docker run -p 3000:3000 --env-file .env -v $(pwd)/keys:/app/keys arduino-server
```

## Ejecutar con Docker Compose

```bash
docker-compose up --build
```

## Ejecutar localmente

```bash
npm install
node Esp32Arduino.js
```

## Endpoints

| Método | Ruta            | Descripción                          |
|--------|-----------------|--------------------------------------|
| POST   | /api/sensor     | Recibe datos del ESP32 (nivel, limite)|
| GET    | /api/dashboard  | Últimos 10 registros del historial   |
| GET    | /api/reporte    | Últimos 30 registros (para PDF)      |


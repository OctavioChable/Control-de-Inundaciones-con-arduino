let limiteActual = 0; 
const SERVER_URL = window.location.origin; 
const suelocm = 6; 


// Configuración de la Gráfica 
const ctx = document.getElementById('floodChart').getContext('2d');
const sonidoAlert = new Audio("alarm.MP3"); 


const floodChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], 
        datasets: [{
            label: 'Nivel del agua',
            data: [],
            borderColor: '#1155ea',
            backgroundColor: 'rgba(37, 100, 235, 0.3)',
            fill: true,
            tension: 0.5
        }]
    },
    options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                usePointStyle: true, 
                pointStyle: 'circle',
                }
            }
        },
        scales: {
            x: {
                title: {
                display: true,
                text: 'Tiempo (hh:mm:ss)'
                }
            },
            y: {
                title: {
                display: true,
                text: 'Nivel del agua (cm)'
                }
            }
        }
    }
});

// CONTROL DEL MODAL INFORMATIVO DE INICIO
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modalInicio");
    const btnEntendido = document.getElementById("btnEntendido");

    if (modal && btnEntendido) {
        // Al dar clic en el botón, el modal se oculta suavemente
        btnEntendido.addEventListener("click", () => {
            modal.style.opacity = "0";
            setTimeout(() => {
                modal.style.display = "none";
            }, 400); // Espera a que termine la transición de opacidad
        });
    }
});


function estaSonandoAlarma() {
    return sonidoAlert && !sonidoAlert.paused && sonidoAlert.currentTime > 0 && !sonidoAlert.ended;
}

function reproducirAlarma(){
    sonidoAlert.loop = true;
    sonidoAlert.play()
}

function pararAlarma(){
    sonidoAlert.pause();
}

function BordeAlerta(Elemento){
    Elemento.classList.add("alerta"); 
}

function pararBordeAlerta(Elemento){
    Elemento.classList.remove("alerta");
}

function activarAlerta(){
    reproducirAlarma();
// CUANDO SE ACTIVA LA ALERTA (Cambia a tonos rojizos)
    document.body.style.background = "linear-gradient(135deg, #f08383 0%, #ea8b8b 100%)";

    const Cont1 = document.getElementById("contenedor1");
    const Cont2 = document.getElementById("contenedor2");
    const Cont3 = document.getElementById("contenedor3");
    const Cont4 = document.getElementById("contenedor4");
    const Cont5 = document.getElementById("contenedor5");

    BordeAlerta(Cont1);
    BordeAlerta(Cont2);
    BordeAlerta(Cont3);
    BordeAlerta(Cont4);
    BordeAlerta(Cont5);
}

function pararAlerta(){
    pararAlarma();


    //CUANDO SE DETIENE LA ALERTA (Vuelve a tu estado original exacto)
    document.body.style.background = "linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 100%)";
    const Cont1 = document.getElementById("contenedor1");
    const Cont2 = document.getElementById("contenedor2");
    const Cont3 = document.getElementById("contenedor3");
    const Cont4 = document.getElementById("contenedor4");
    const Cont5 = document.getElementById("contenedor5");

    pararBordeAlerta(Cont1);
    pararBordeAlerta(Cont2);
    pararBordeAlerta(Cont3);
    pararBordeAlerta(Cont4);
    pararBordeAlerta(Cont5);
}

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
    let resumen = analizarLecturas(values);

    const resumenElement = document.getElementById('resumenComportamiento');
    if (resumenElement) resumenElement.innerText = resumen;

    return resumen;
}


function analizarLecturas(valores) {
    if (valores.length < 2) return "Esperando más datos...";

    // 1. Calcular promedio
    const promedio = valores.reduce((acc, v) => acc + v, 0) / valores.length;

    // 2. Calcular desviación estándar
    const varianza = valores.reduce((acc, v) => acc + Math.pow(v - promedio, 2), 0) / valores.length;
    const desviacion = Math.sqrt(varianza);

    // 3. Calcular diferencia global (último - primero)
    const diferencia = valores[valores.length - 1] - valores[0];

    // 4. Calcular tendencia lineal aproximada (regresión simple)
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < valores.length; i++) {
        sumX += i;
        sumY += valores[i];
        sumXY += i * valores[i];
        sumX2 += i * i;
    }
    const pendiente = (valores.length * sumXY - sumX * sumY) / (valores.length * sumX2 - sumX * sumX);

    // 5. Interpretación combinada
    let resumen = "";
    if (desviacion > 2) {
        resumen = "Comportamiento inestable: fluctuaciones fuertes en las lecturas.";
    } else if (desviacion <= 0.5) {
        resumen = "Estado estable: lecturas muy consistentes.";
    } else if (pendiente > 0.5) {
        resumen = `Tendencia al alza: el nivel subió en promedio ~${pendiente.toFixed(2)} cm por lectura.`;
    } else if (pendiente < -0.5) {
        resumen = `Tendencia a la baja: el nivel bajó en promedio ~${Math.abs(pendiente).toFixed(2)} cm por lectura.`;
    } else {
        resumen = "Variación leve detectada: cambios moderados sin tendencia clara.";
    }

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
            if(estaSonandoAlarma()){
                pararAlerta();
            }
        } else if (DangerLevel < 80) {
            dangerBar.style.background = "linear-gradient(to top, #facb53, #fcaa4d)";
            mensajes = "El nivel del agua está subiendo, manténgase atento.";
            if(estaSonandoAlarma()){
                pararAlerta();
            }
        } else {
            dangerBar.style.background = "linear-gradient(to top, #e65858, #c91c1c)";
            mensajes = "El nivel del agua es peligroso, evacue de inmediato.";
            if(!estaSonandoAlarma()){
                activarAlerta();
            }
            
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
    doc.text("REPORTE DE MONITOREO - IoT ESP32 - HC SR04", doc.internal.pageSize.getWidth() / 2, 25, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`Fecha y hora de emisión: ${new Date().toLocaleString()}`, doc.internal.pageSize.getWidth() / 2, 40, { align: "center" });
    doc.text("Base de Datos: Firebase", doc.internal.pageSize.getWidth() / 2, 50, { align: "center" });
    
    const response = await fetch(`${SERVER_URL}/api/reporte`);
    const data = await response.json();
    
    if (data) {
        let yPos = 70;
        doc.setFont("helvetica", "bold");
        doc.text("Hora de Lectura", 25, 65);
        doc.text("Nivel Detectado (cm)", 80, 65);
        doc.setFont("helvetica", "normal");

        Object.keys(data).forEach((key, index) => {
            const lectura = data[key];
            const hora = new Date(lectura.timestamp).toLocaleTimeString();
            let nivelAguaExpo = suelocm - lectura.valor;
            doc.text(hora, 35, yPos);
            doc.text(`${nivelAguaExpo} cm`, 90, yPos);
            
            yPos += 8; // Espaciado entre filas

            // Crear página nueva si el reporte es muy largo
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
        });

        const pageCount = doc.internal.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(100);

            // Texto centrado abajo
            doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: "center" }
            );
        }

        // Guardar el archivo
        doc.save(`Reporte_${Date.now()}.pdf`);
    }else {
        alert("No hay datos disponibles para exportar.");
    }
}
document.getElementById('btnExportar').addEventListener('click', exportarReportePDF);

let saldo = 0.00;
let bolaSeleccionada = ""; 
let precioSeleccionado = 0.00;
let baseDeDatosGashapon = null;

// Displays y manivela
const precioDisplay = document.getElementById('precio-display');
const saldoDisplay = document.getElementById('saldo-display');
const displayBebida = document.getElementById('seleccion-display');
const btnGirar = document.getElementById('btn-girar');

// Efectos de sonido y efectivo
const audioMoneda = document.getElementById('sonidoMoneda');
const audioManivela = document.getElementById('sonidoManivela'); 
const audioBola = document.getElementById('sonidoBola');
const audioDevolucion = document.getElementById('sonidoDevolucion');
const sistemaEfectivo = [20.00, 10.00, 5.00, 2.00, 1.00, 0.50, 0.20, 0.10, 0.05];

/*Maquina con inventrio JSON */
async function inicializarInventario() {
    const datosGuardados = localStorage.getItem('inventario_gashapon');
    if (datosGuardados) {
        baseDeDatosGashapon = JSON.parse(datosGuardados);
        volcarDatosEnPantalla();
    } else {
        try {
            const respuesta = await fetch('inventario.json');
            if (!respuesta.ok) throw new Error("Error de respuesta");
            baseDeDatosGashapon = await respuesta.json();
            guardarCambiosEnJSON();
            volcarDatosEnPantalla();
        } catch (error) {
            console.error("No se pudo cargar el archivo inventario.json:", error);
            alert("Error al cargar el archivo de inventario base.");
        }
    }
}

function guardarCambiosEnJSON() {
    localStorage.setItem('inventario_gashapon', JSON.stringify(baseDeDatosGashapon));
}

function volcarDatosEnPantalla() {
    for (let clave in baseDeDatosGashapon) {
        const spanStock = document.getElementById(`stock-${clave}`);
        const spanPrecio = document.getElementById(`precio-${clave}`);
        const boton = document.getElementById(`btn-${clave}`);
        const item = baseDeDatosGashapon[clave];

        if (spanPrecio) spanPrecio.textContent = `${item.precio.toFixed(2)}€`;
        if (spanStock && boton) {
            if (item.stock > 0) {
                spanStock.textContent = `Stock: ${item.stock}`;
                boton.disabled = false;
            } else {
                spanStock.textContent = `Agotado`;
                boton.disabled = true; 
            }
        }
    }
    actualizarDisplay();
}

/* =======================================================
   GESTIÓN DE IMPORTACIÓN / EXPORTACIÓN / RESET (JSON)
   ======================================================= */

function exportarInventario() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(baseDeDatosGashapon, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "inventario_gashapon.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function dispararSelectorArchivo() {
    document.getElementById('input-importar-json').click();
}

function importarInventario(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const jsonImportado = JSON.parse(e.target.result);
            
            if (jsonImportado["Bola Transparente"] && jsonImportado["Bola Transparente"].hasOwnProperty('stock')) {
                baseDeDatosGashapon = jsonImportado;
                guardarCambiosEnJSON();
                volcarDatosEnPantalla();
                resetearMaquina();
                alert("¡Inventario cargado con éxito! 📂");
            } else {
                alert("El archivo JSON no tiene la estructura válida de la Gashapon.");
            }
        } catch (err) {
            alert("Error al procesar el archivo JSON.");
        }
    };
    lector.readAsText(archivo);
    event.target.value = ''; 
}

/* MODIFICADO: Reseteo asíncrono apuntando al archivo original independiente */
async function restablecerInventarioOriginal() {
    if(confirm("¿Quieres recargar el stock de la máquina?")) {
        try {
            const respuesta = await fetch('inventario.json');
            if (!respuesta.ok) throw new Error("Error de respuesta");
            baseDeDatosGashapon = await respuesta.json();
            guardarCambiosEnJSON();
            volcarDatosEnPantalla();
            resetearMaquina();
        } catch (error) {
            alert("No se pudo leer el archivo original para restablecer.");
        }
    }
}

/* =======================================================
   MECÁNICA GENERAL DE LA MÁQUINA
   ======================================================= */

function insertarMoneda(valor) {
    saldo += valor;
    saldo = parseFloat(saldo.toFixed(2));
    if(audioMoneda) audioMoneda.play();
    actualizarDisplay();
    evaluarEstadoManivela();
}

function seleccionarBola(nombre) {
    bolaSeleccionada = nombre;
    precioSeleccionado = baseDeDatosGashapon[nombre].precio;
    actualizarDisplay();
    evaluarEstadoManivela();
}

function evaluarEstadoManivela() {
    if (bolaSeleccionada !== "" && saldo >= precioSeleccionado && baseDeDatosGashapon[bolaSeleccionada].stock > 0) {
        btnGirar.disabled = false;
    } else {
        btnGirar.disabled = true;
    }
}

function devolverEfectivo() {
    if (saldo > 0) {
        if(audioDevolucion) {
            audioDevolucion.currentTime = 0;
            audioDevolucion.play();
        }
        let desgloseCambio = calcularCambioOptimo(saldo);
        displayBebida.innerHTML = `DEVOLVIENDO: ${saldo.toFixed(2)} €<br>${desgloseCambio}`;
    }
    resetearMaquina();
    setTimeout(function() { actualizarDisplay(); }, 5000);
}

function resetearMaquina() {
    saldo = 0.00;
    bolaSeleccionada = "";
    precioSeleccionado = 0.00;
    saldoDisplay.textContent = `SALDO: 0.00 €`;
    precioDisplay.textContent = "PRECIO: 0.00 €";
    btnGirar.disabled = true;
}

function calcularCambioOptimo(cantidad) {
    let restante = parseFloat(cantidad.toFixed(2));
    let htmlLista = '<ul class="lista-devolucion">';
    let tieneElementos = false;

    for (let valor of sistemaEfectivo) {
        if (restante >= valor) {
            let cantidadUnidades = Math.floor(restante / valor);
            tieneElementos = true;
            if (valor >= 5.00) {
                htmlLista += `<li>• ${cantidadUnidades}  Billetes de ${valor.toFixed(0)}€</li>`;
            } else {
                htmlLista += `<li>• ${cantidadUnidades}  Monedas de ${valor.toFixed(2)}€</li>`;
            }
            restante = parseFloat((restante % valor).toFixed(2));
        }
    }
    htmlLista += '</ul>';
    return tieneElementos ? htmlLista : "0.00€";
}

function comprobarCompra() {
    if (bolaSeleccionada !== "" && saldo >= precioSeleccionado && baseDeDatosGashapon[bolaSeleccionada].stock > 0) {
        
        btnGirar.disabled = true; 

        // Sonido giro de la manivela 
        if (audioManivela) {
            audioManivela.currentTime = 0;
            audioManivela.play();
        }

        displayBebida.innerHTML = `GIRANDO MANIVELA... 🔄`;

        // Tiempo 1.2 segundos para el siguiente sonido
        setTimeout(function() {
            
            // Sonido de la bola cayendo por el conducto
            if (audioBola) {
                audioBola.currentTime = 0;
                audioBola.play();
            }

            baseDeDatosGashapon[bolaSeleccionada].stock -= 1;
            guardarCambiosEnJSON();
            volcarDatosEnPantalla(); 

            let vueltas = parseFloat((saldo - precioSeleccionado).toFixed(2));
            let premioObtenido = baseDeDatosGashapon[bolaSeleccionada].premio;

            saldoDisplay.textContent = "¡LA BOLA ES TUYA!";
            precioDisplay.textContent = "PRECIO: 0.00 €";
            
            if (vueltas > 0) {
                let desgloseCambio = calcularCambioOptimo(vueltas);
                displayBebida.innerHTML = `💥 ¡Abriendo ${bolaSeleccionada.toUpperCase()}!<br>🎁 Premio: ${premioObtenido}<br><br>DEVOLUCIÓN:<br>${desgloseCambio}`;
                
                if (audioDevolucion) {
                    audioDevolucion.currentTime = 0;
                    audioDevolucion.play();
                }
            } else {
                displayBebida.innerHTML = `💥 ¡Abriendo ${bolaSeleccionada.toUpperCase()}!<br>🎁 Premio: ${premioObtenido}`;
            }

            // Limpieza del estado interno de la máquina
            saldo = 0.00; 
            bolaSeleccionada = "";
            precioSeleccionado = 0.00;

            // Restablece las pantallas a su estado inicial tras mostrar el premio durante 6 segundos
            setTimeout(function() {
                actualizarDisplay(); 
            }, 6000);

        }, 1200); // Simulacion el giro físico de la manivela 
    }
}

function actualizarDisplay() {
    saldoDisplay.textContent = `SALDO: ${saldo.toFixed(2)} €`;
    if (bolaSeleccionada === "") {
        precioDisplay.textContent = "PRECIO: 0.00 €";
        displayBebida.textContent = "NO HAY PRODUCTO SELECCIONADO";
    } else {
        precioDisplay.textContent = `PRECIO: ${precioSeleccionado.toFixed(2)} €`;
        displayBebida.textContent = "SELECCIÓN: " + bolaSeleccionada.toUpperCase();
    }
}

window.onload = inicializarInventario;
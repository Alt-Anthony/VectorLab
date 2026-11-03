// Laboratorio: arrastra piezas al lienzo cuadriculado, muévelas, rótalas, edítalas y simula.
// Usa PIEZAS, VALORES, UNIDADES y dibujoDe (piezas.js) y crearSimulacion y detectarConexiones (simulacion.js).
// Con ?pregunta=ID carga la figura de esa pregunta; con &modo=solucion solo muestra la figura (no se edita).

const SVG_NS = 'http://www.w3.org/2000/svg';
const CUADRICULA = 20;
const PASO_ROTACION = 15;
const ALTURA_SUELO = 40;        // distancia del suelo al borde inferior del lienzo
const LARGO_MAXIMO_CUADROS = 40;
const TEXTO_MAXIMO = 12;

const parametrosUrl = new URLSearchParams(window.location.search);
const MODO_SOLUCION = parametrosUrl.get('modo') === 'solucion';
const TEXTO_INICIAR = MODO_SOLUCION ? '▶ Empezar' : '▶ Simular';

const $ = (id) => document.getElementById(id);
const lienzo = $('lienzo');
const capaPiezas = $('capaPiezas');
const capaConexiones = $('capaConexiones');
const suelo = $('suelo');
const listaRecursos = $('listaRecursos');
const campos = { valor: $('campoValor'), texto: $('campoTexto'), largo: $('campoLargo'), nombre: $('campoNombre') };
const entradas = {
    valor: $('inputValor'),
    texto: $('inputTexto'),
    largo: $('inputLargo'),
    nombre: $('inputNombre'),
    unidad: $('selectorUnidad')
};
const botones = {
    simular: $('btnSimular'),
    rotarIzquierda: $('btnRotarIzq'),
    rotarDerecha: $('btnRotarDer'),
    eliminar: $('btnEliminar'),
    limpiar: $('btnLimpiar')
};

let piezas = [];          // [{ id, tipo, x, y, rotacion, valor, texto, largo, ref }]; valor en kg (masa) o N (fuerza)
let seleccionada = null;  // id de la pieza seleccionada
let arrastre = null;      // { id, dx, dy, esNueva }
let simulacion = null;    // simulación en curso (crearSimulacion)
let unidadActual = 'N';   // cómo se muestran los pesos: N, kg o kgf
let sueloY = 0;
let siguienteId = 1;
let conectadosAntes = new Set(); // claves de los puntos que ya estaban unidos
let audio = null;
const nodos = new Map();  // id -> <g> de la pieza en el lienzo

const ajustarACuadricula = (valor) => Math.round(valor / CUADRICULA) * CUADRICULA;
const buscarPieza = (id) => piezas.find((p) => p.id === id);
const piezaSeleccionada = () => (seleccionada === null ? null : buscarPieza(seleccionada));
const redondear = (numero) => Number(numero.toFixed(3));
const formatear = (numero) => Number(numero.toFixed(2)).toLocaleString('es-PE');

// Convierte la posición del puntero en la pantalla a coordenadas del lienzo
function puntoEnLienzo(evento) {
    const punto = new DOMPoint(evento.clientX, evento.clientY);
    return punto.matrixTransform(lienzo.getScreenCTM().inverse());
}

function estaSobreElLienzo(evento) {
    const r = lienzo.getBoundingClientRect();
    return evento.clientX >= r.left && evento.clientX <= r.right && evento.clientY >= r.top && evento.clientY <= r.bottom;
}

function dibujarSuelo() {
    const { width, height } = lienzo.getBoundingClientRect();
    sueloY = ajustarACuadricula(height - ALTURA_SUELO);
    suelo.setAttribute('transform', `translate(0 ${sueloY})`);
    suelo.querySelectorAll('rect').forEach((rect) => rect.setAttribute('width', width));
}

/* ---------- Unidades: por dentro kg y N, por fuera la unidad elegida ---------- */

function conversion(pieza) {
    const regla = VALORES[pieza.tipo];
    return regla ? UNIDADES[unidadActual][regla.magnitud] : null;
}

function textoDeValor(pieza) {
    const c = conversion(pieza);
    return c ? `${formatear(pieza.valor * c.factor)} ${c.simbolo}` : '';
}

/* ---------- Dibujo de las piezas ---------- */

// estiramiento: solo lo usan las cuerdas al simular (largo actual / largo original)
function ponerTransform(id, { x, y }, grados, estiramiento = 1) {
    nodos.get(id).setAttribute('transform', `translate(${x} ${y}) rotate(${grados}) scale(1 ${estiramiento})`);
}

const actualizarNodo = (pieza) => ponerTransform(pieza.id, pieza, pieza.rotacion);

// Los textos que escribe el usuario se ponen con textContent (nunca como HTML)
function rellenarTextos(pieza) {
    const nodo = nodos.get(pieza.id);
    const valor = nodo.querySelector('.valor');
    if (valor && VALORES[pieza.tipo]) valor.textContent = textoDeValor(pieza);
    const texto = nodo.querySelector('.texto');
    if (texto && pieza.texto !== null) texto.textContent = pieza.texto;
}

function renderizarNodo(pieza) {
    const { svg, zona: [x, y, ancho, alto] } = dibujoDe(pieza);
    nodos.get(pieza.id).innerHTML = `${svg}<rect class="zona" x="${x}" y="${y}" width="${ancho}" height="${alto}"/>`;
    rellenarTextos(pieza);
    actualizarNodo(pieza);
}

/* ---------- Conexiones: marcas verdes/rojas, pulso y sonido ---------- */

// "Pop" corto generado con Web Audio (sin archivos de sonido)
function sonarPop() {
    audio = audio || new AudioContext();
    const ahora = audio.currentTime;
    const oscilador = audio.createOscillator();
    const volumen = audio.createGain();
    oscilador.type = 'sine';
    oscilador.frequency.setValueAtTime(700, ahora);
    oscilador.frequency.exponentialRampToValueAtTime(220, ahora + 0.08);
    volumen.gain.setValueAtTime(0.25, ahora);
    volumen.gain.exponentialRampToValueAtTime(0.001, ahora + 0.1);
    oscilador.connect(volumen).connect(audio.destination);
    oscilador.start(ahora);
    oscilador.stop(ahora + 0.11);
}

function crearCirculo({ x, y }, clase) {
    const circulo = document.createElementNS(SVG_NS, 'circle');
    circulo.setAttribute('cx', x);
    circulo.setAttribute('cy', y);
    circulo.setAttribute('r', 5);
    circulo.setAttribute('class', clase);
    return circulo;
}

function dibujarConexiones(puntos, nuevas) {
    capaConexiones.replaceChildren(...puntos.flatMap((punto) => {
        const marca = crearCirculo(punto, punto.conectado ? 'conexion unida' : 'conexion suelta');
        return nuevas.has(punto.clave) ? [crearCirculo(punto, 'pulso'), marca] : [marca];
    }));
}

// registrar: true al soltar una pieza (anima y suena lo que se acaba de unir); false mientras se arrastra.
// sonar: false al cargar una escena (el navegador no deja sonar audio sin un clic del usuario).
function actualizarConexiones({ registrar, sonar = registrar }) {
    const puntos = detectarConexiones({ piezas, ancho: lienzo.getBoundingClientRect().width, sueloY });
    const conectados = new Set(puntos.filter((p) => p.conectado).map((p) => p.clave));
    const nuevas = registrar ? new Set([...conectados].filter((clave) => !conectadosAntes.has(clave))) : new Set();
    dibujarConexiones(puntos, nuevas);
    if (!registrar) return;
    if (sonar && nuevas.size > 0) sonarPop();
    conectadosAntes = conectados;
}

/* ---------- Cambios al estado (siempre crean objetos nuevos) ---------- */

function cambiarPieza(id, cambios) {
    piezas = piezas.map((p) => (p.id === id ? { ...p, ...cambios } : p));
    const pieza = buscarPieza(id);
    if ('largo' in cambios) {
        renderizarNodo(pieza);
    } else {
        actualizarNodo(pieza);
        rellenarTextos(pieza);
    }
}

// Muestra en la barra superior los campos que tiene la pieza seleccionada
function mostrarCampos(pieza) {
    const c = pieza && conversion(pieza);
    campos.valor.hidden = !c;
    if (c) {
        campos.valor.querySelector('[data-etiqueta]').textContent = c.etiqueta;
        campos.valor.querySelector('[data-unidad]').textContent = c.simbolo;
        entradas.valor.value = redondear(pieza.valor * c.factor);
    }
    campos.texto.hidden = !pieza || pieza.texto === null;
    if (!campos.texto.hidden) entradas.texto.value = pieza.texto;
    campos.largo.hidden = !pieza || pieza.largo === null;
    if (!campos.largo.hidden) entradas.largo.value = pieza.largo / CUADRICULA;
    campos.nombre.hidden = !pieza;
    if (pieza) entradas.nombre.value = pieza.ref || '';
}

function seleccionar(id) {
    seleccionada = id;
    nodos.forEach((nodo, idNodo) => nodo.classList.toggle('activa', idNodo === id));
    if (id !== null) capaPiezas.append(nodos.get(id)); // la seleccionada queda encima de las demás
    const sinSeleccion = id === null;
    botones.rotarIzquierda.disabled = sinSeleccion;
    botones.rotarDerecha.disabled = sinSeleccion;
    botones.eliminar.disabled = sinSeleccion;
    mostrarCampos(piezaSeleccionada());
}

function agregarPieza(tipo, x, y, extra = {}) {
    const definicion = PIEZAS[tipo];
    const regla = VALORES[tipo];
    const pieza = {
        id: siguienteId++,
        tipo,
        x: ajustarACuadricula(x),
        y: ajustarACuadricula(y),
        rotacion: 0,
        valor: regla ? regla.inicial : null,
        texto: definicion.textoInicial ?? null,
        largo: definicion.largoInicial ?? null,
        ref: null,
        ...extra
    };
    piezas = [...piezas, pieza];

    const nodo = document.createElementNS(SVG_NS, 'g');
    nodo.classList.add('pieza');
    nodo.addEventListener('pointerdown', (evento) => empezarAMover(evento, pieza.id));
    nodos.set(pieza.id, nodo);
    capaPiezas.append(nodo);
    renderizarNodo(pieza);
    seleccionar(pieza.id);
    return pieza;
}

function eliminarPieza(id) {
    piezas = piezas.filter((p) => p.id !== id);
    nodos.get(id).remove();
    nodos.delete(id);
    if (seleccionada === id) seleccionar(null);
    actualizarConexiones({ registrar: true });
}

function rotarPieza(id, grados) {
    const pieza = buscarPieza(id);
    cambiarPieza(id, { rotacion: (pieza.rotacion + grados + 360) % 360 });
    actualizarConexiones({ registrar: true });
}

function limpiarTodo() {
    if (piezas.length === 0 || !window.confirm('¿Quitar todas las piezas del lienzo?')) return;
    [...nodos.keys()].forEach(eliminarPieza);
}

/* ---------- Campos de la barra superior ---------- */

function alCambiarValor() {
    const pieza = piezaSeleccionada();
    const c = pieza && conversion(pieza);
    const mostrado = Number(entradas.valor.value);
    if (!c || !Number.isFinite(mostrado)) return;
    const interno = mostrado / c.factor;
    const regla = VALORES[pieza.tipo];
    if (interno < regla.min || interno > regla.max) return;
    cambiarPieza(pieza.id, { valor: interno });
}

function alCambiarTexto() {
    const pieza = piezaSeleccionada();
    if (pieza && pieza.texto !== null) cambiarPieza(pieza.id, { texto: entradas.texto.value.slice(0, TEXTO_MAXIMO) });
}

function alCambiarLargo() {
    const pieza = piezaSeleccionada();
    const cuadros = Number(entradas.largo.value);
    if (!pieza || pieza.largo === null || !Number.isInteger(cuadros) || cuadros < 1 || cuadros > LARGO_MAXIMO_CUADROS) return;
    cambiarPieza(pieza.id, { largo: cuadros * CUADRICULA });
}

// Nombre de la pieza (ref) para que los pasos de la solución puedan resaltarla. Solo letras, números y _
function alCambiarNombre() {
    const pieza = piezaSeleccionada();
    const nombre = entradas.nombre.value.trim();
    if (!pieza || !/^[A-Za-z0-9_]{0,30}$/.test(nombre)) return;
    cambiarPieza(pieza.id, { ref: nombre || null });
}

function alCambiarUnidad() {
    if (!UNIDADES[entradas.unidad.value]) return;
    unidadActual = entradas.unidad.value;
    piezas.forEach(rellenarTextos);
    mostrarCampos(piezaSeleccionada());
}

/* ---------- Simulación ---------- */

function reflejarSimulacion() {
    const simulando = Boolean(simulacion);
    document.body.classList.toggle('simulando', simulando);
    botones.simular.textContent = simulando ? '■ Detener' : TEXTO_INICIAR;
    botones.limpiar.disabled = simulando;
}

function iniciarSimulacion() {
    if (simulacion) return;
    seleccionar(null);
    simulacion = crearSimulacion({
        piezas,
        ancho: lienzo.getBoundingClientRect().width,
        sueloY,
        alDibujar: ponerTransform
    });
    reflejarSimulacion();
}

function detenerSimulacion() {
    if (!simulacion) return;
    simulacion.detener();
    simulacion = null;
    piezas.forEach(actualizarNodo); // todo vuelve a donde estaba
    reflejarSimulacion();
}

const alternarSimulacion = () => (simulacion ? detenerSimulacion() : iniciarSimulacion());

// En modo solución, si la pregunta tiene pasos, el botón principal empieza la resolución paso a paso (pasos.js)
function alPresionarBotonPrincipal() {
    if (MODO_SOLUCION && hayPasos()) {
        empezarPasos();
    } else {
        alternarSimulacion();
    }
}

/* ---------- Arrastrar ---------- */

function empezarDesdeRecurso(evento, tipo) {
    if (simulacion || MODO_SOLUCION) return;
    evento.preventDefault();
    const { x, y } = puntoEnLienzo(evento);
    const pieza = agregarPieza(tipo, x, y);
    arrastre = { id: pieza.id, dx: 0, dy: 0, esNueva: true };
    document.body.classList.add('arrastrando');
}

function empezarAMover(evento, id) {
    if (simulacion || MODO_SOLUCION) return;
    evento.preventDefault();
    evento.stopPropagation();
    const pieza = buscarPieza(id);
    const { x, y } = puntoEnLienzo(evento);
    seleccionar(id);
    arrastre = { id, dx: pieza.x - x, dy: pieza.y - y, esNueva: false };
    document.body.classList.add('arrastrando');
}

function alMoverPuntero(evento) {
    if (!arrastre) return;
    const { x, y } = puntoEnLienzo(evento);
    cambiarPieza(arrastre.id, { x: ajustarACuadricula(x + arrastre.dx), y: ajustarACuadricula(y + arrastre.dy) });
    actualizarConexiones({ registrar: false });
}

function alSoltarPuntero(evento) {
    if (!arrastre) return;
    // Una pieza nueva que se suelta fuera del lienzo no se agrega
    if (arrastre.esNueva && !estaSobreElLienzo(evento)) eliminarPieza(arrastre.id);
    arrastre = null;
    document.body.classList.remove('arrastrando');
    actualizarConexiones({ registrar: true });
}

/* ---------- Teclado ---------- */

function alPresionarTecla(evento) {
    if (simulacion || MODO_SOLUCION || seleccionada === null || evento.target.closest('input, select')) return;
    if (evento.key === 'Delete' || evento.key === 'Backspace') {
        evento.preventDefault();
        eliminarPieza(seleccionada);
    } else if (evento.key.toLowerCase() === 'r' && !evento.metaKey && !evento.ctrlKey) {
        rotarPieza(seleccionada, evento.shiftKey ? -PASO_ROTACION : PASO_ROTACION);
    } else if (evento.key === 'Escape') {
        seleccionar(null);
    }
}

/* ---------- Inicio ---------- */

function crearRecurso([tipo, definicion]) {
    const { svg, zona: [x, y, ancho, alto] } = dibujoDe({ tipo, largo: definicion.largoInicial });
    const recurso = document.createElement('div');
    recurso.className = 'recurso';
    recurso.title = `Arrastra: ${definicion.nombre}`;
    recurso.innerHTML = `<svg viewBox="${x - 6} ${y - 6} ${ancho + 12} ${alto + 12}">${svg}</svg>`;
    const etiqueta = document.createElement('span');
    etiqueta.textContent = definicion.nombre;
    recurso.append(etiqueta);
    recurso.addEventListener('pointerdown', (evento) => empezarDesdeRecurso(evento, tipo));
    return recurso;
}

function iniciar() {
    document.body.classList.toggle('modo-solucion', MODO_SOLUCION);
    botones.simular.textContent = TEXTO_INICIAR;
    listaRecursos.replaceChildren(...Object.entries(PIEZAS).map(crearRecurso));
    dibujarSuelo();
    window.addEventListener('resize', dibujarSuelo);
    lienzo.addEventListener('pointerdown', () => { if (!simulacion) seleccionar(null); }); // clic en zona vacía
    window.addEventListener('pointermove', alMoverPuntero);
    window.addEventListener('pointerup', alSoltarPuntero);
    document.addEventListener('keydown', alPresionarTecla);
    entradas.valor.addEventListener('input', alCambiarValor);
    entradas.texto.addEventListener('input', alCambiarTexto);
    entradas.largo.addEventListener('input', alCambiarLargo);
    entradas.nombre.addEventListener('input', alCambiarNombre);
    entradas.unidad.addEventListener('change', alCambiarUnidad);
    botones.simular.addEventListener('click', alPresionarBotonPrincipal);
    botones.rotarIzquierda.addEventListener('click', () => rotarPieza(seleccionada, -PASO_ROTACION));
    botones.rotarDerecha.addEventListener('click', () => rotarPieza(seleccionada, PASO_ROTACION));
    botones.eliminar.addEventListener('click', () => eliminarPieza(seleccionada));
    botones.limpiar.addEventListener('click', limpiarTodo);
    seleccionar(null);
}

iniciar();

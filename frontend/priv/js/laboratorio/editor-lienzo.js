// El lienzo del laboratorio: aquí se arrastran las piezas, se mueven, se rotan, se editan y se simula.
// Las piezas vienen de dibujo-piezas.js y la física de motor-fisica.js.
// La barra lateral tiene tres pestañas: Física, Circuitos (las piezas con grupo 'circuitos') y Geometría
// (capa-geometria.js). Lo que solo se ve al simular (corriente, proyectiles) lo dibuja efectos-simulacion.js.
// Si la dirección trae ?pregunta=ID se carga esa figura; con &modo=solucion solo se mira, no se edita.
// Con ?pestana=geometria se abre directo en la pestaña Geometría.

const SVG_NS = 'http://www.w3.org/2000/svg';
const CUADRICULA = 20;
const PASO_ROTACION = 15;
const ALTURA_SUELO = 40;        // espacio que queda debajo del suelo
const LARGO_MAXIMO_CUADROS = 40;
const ANGULO_MAXIMO = 89;      // el lanzador apunta entre -89° y 89°
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
const campos = {
    valor: $('campoValor'),
    texto: $('campoTexto'),
    largo: $('campoLargo'),
    angulo: $('campoAngulo'),
    nombre: $('campoNombre')
};
const entradas = {
    valor: $('inputValor'),
    texto: $('inputTexto'),
    largo: $('inputLargo'),
    angulo: $('inputAngulo'),
    nombre: $('inputNombre'),
    unidad: $('selectorUnidad')
};
const botones = {
    simular: $('btnSimular'),
    rotarIzquierda: $('btnRotarIzq'),
    rotarDerecha: $('btnRotarDer'),
    eliminar: $('btnEliminar'),
    espejo: $('btnEspejo'),
    limpiar: $('btnLimpiar')
};

let piezas = [];          // las piezas del lienzo { id, tipo, x, y, rotacion, valor, texto, largo, ref }; peso en kg, fuerza en N
let seleccionada = null;  // la pieza que está elegida ahora
let arrastre = null;      // la pieza que se está arrastrando y desde dónde se agarró
let simulacion = null;    // la simulación que está corriendo, si hay una
let unidadActual = 'N';   // en qué unidad se ven los pesos: N, kg o kgf
let sueloY = 0;
let siguienteId = 1;
let conectadosAntes = new Set(); // los puntos que ya estaban unidos, para no hacer "pop" dos veces
let audio = null;
const nodos = new Map();  // el dibujo de cada pieza en el lienzo, buscado por su id

const ajustarACuadricula = (valor) => Math.round(valor / CUADRICULA) * CUADRICULA;
const buscarPieza = (id) => piezas.find((p) => p.id === id);
const piezaSeleccionada = () => (seleccionada === null ? null : buscarPieza(seleccionada));
const redondear = (numero) => Number(numero.toFixed(3));
const formatear = (numero) => Number(numero.toFixed(2)).toLocaleString('es-PE');

// Pasa la posición del mouse en la pantalla a una posición dentro del lienzo
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

/* ---------- Unidades: se guarda en kg y N, se muestra en la que elijas ---------- */

function conversion(pieza) {
    const regla = VALORES[pieza.tipo];
    return regla ? UNIDADES[unidadActual][regla.magnitud] : null;
}

// Sobre la pieza: "20 N", "2 kg", "30°" o, en un engranaje, solo el número de dientes
function textoDeValor(pieza) {
    const c = conversion(pieza);
    return c ? `${c.prefijo ?? ''}${formatear(pieza.valor * c.factor)}${c.sufijo ?? ` ${c.simbolo}`}` : '';
}

/* ---------- Dibujo de las piezas ---------- */

// estiramiento: cuánto se estiró la cuerda al simular (1 es su largo normal)
// Lo que está en un grupo .sin-giro (el número del engranaje) se gira al revés para que siempre se lea derecho
function ponerTransform(id, { x, y }, grados, estiramiento = 1) {
    const nodo = nodos.get(id);
    nodo.setAttribute('transform', `translate(${x} ${y}) rotate(${grados}) scale(1 ${estiramiento})`);
    nodo.querySelector('.sin-giro')?.setAttribute('transform', `rotate(${-grados})`);
}

const actualizarNodo = (pieza) => ponerTransform(pieza.id, pieza, pieza.rotacion);

// Lo que escribe el usuario se pone como texto simple, nunca como HTML, para que no se pueda meter código
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

/* ---------- Conexiones: punto verde si está unido, rojo si está suelto, con pulso y "pop" ---------- */

// El "pop" se genera en el momento con Web Audio, no hay ningún archivo de sonido
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

// registrar: al soltar una pieza se anima y suena lo que se acaba de unir; mientras se arrastra, no.
// sonar: al cargar una figura no suena, porque el navegador no deja sonar nada antes de un clic.
function actualizarConexiones({ registrar, sonar = registrar }) {
    dibujarLineasDeCampo(piezas); // efectos-simulacion.js: las líneas de campo de las cargas siguen a las piezas
    const puntos = detectarConexiones({ piezas, ancho: lienzo.getBoundingClientRect().width, sueloY });
    const conectados = new Set(puntos.filter((p) => p.conectado).map((p) => p.clave));
    const nuevas = registrar ? new Set([...conectados].filter((clave) => !conectadosAntes.has(clave))) : new Set();
    dibujarConexiones(puntos, nuevas);
    if (!registrar) return;
    if (sonar && nuevas.size > 0) sonarPop();
    conectadosAntes = conectados;
}

/* ---------- Cambios en las piezas (siempre se crea una copia nueva, no se toca la anterior) ---------- */

function cambiarPieza(id, cambios) {
    piezas = piezas.map((p) => (p.id === id ? { ...p, ...cambios } : p));
    const pieza = buscarPieza(id);
    // La cota cambia con su largo; la rampa y el engranaje, con su valor (ángulo o dientes)
    // Las piezas que se dibujan con una función (cota, rampa, engranaje, componentes...) cambian de dibujo
    // con su largo, su valor, su ángulo o su giro (el texto de un componente parado va a un costado)
    const dibujoCambia = typeof PIEZAS[pieza.tipo].svg === 'function' && ['largo', 'valor', 'angulo', 'rotacion', 'espejo'].some((campo) => campo in cambios);
    if (dibujoCambia) {
        renderizarNodo(pieza);
    } else {
        actualizarNodo(pieza);
        rellenarTextos(pieza);
    }
}

// Muestra arriba solo los campos que tiene la pieza elegida (peso, texto, largo...)
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
    campos.angulo.hidden = !pieza || pieza.angulo === null;
    if (!campos.angulo.hidden) entradas.angulo.value = pieza.angulo;
    campos.nombre.hidden = !pieza;
    if (pieza) entradas.nombre.value = pieza.ref || '';
}

function seleccionar(id) {
    seleccionada = id;
    nodos.forEach((nodo, idNodo) => nodo.classList.toggle('activa', idNodo === id));
    if (id !== null) capaPiezas.append(nodos.get(id)); // la pieza elegida se pone encima de las demás
    const sinSeleccion = id === null;
    botones.rotarIzquierda.disabled = sinSeleccion;
    botones.rotarDerecha.disabled = sinSeleccion;
    botones.eliminar.disabled = sinSeleccion;
    const elegida = piezaSeleccionada();
    botones.espejo.disabled = !elegida || !PIEZAS[elegida.tipo].espejable;
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
        angulo: definicion.anguloInicial ?? null,
        espejo: false,
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

// sentido: 1 o -1. Cada pieza gira de a PASO_ROTACION, salvo las que dicen otro paso (los componentes, de a 90°)
function rotarPieza(id, sentido) {
    const pieza = buscarPieza(id);
    const grados = sentido * (PIEZAS[pieza.tipo].pasoRotacion ?? PASO_ROTACION);
    cambiarPieza(id, { rotacion: (pieza.rotacion + grados + 360) % 360 });
    actualizarConexiones({ registrar: true });
}

// Quita las piezas de física y también la geometría (capa-geometria.js)
function limpiarTodo() {
    const hayAlgo = piezas.length > 0 || hayGeometria();
    if (!hayAlgo || !window.confirm('¿Quitar todo lo que hay en el lienzo?')) return;
    [...nodos.keys()].forEach(eliminarPieza);
    limpiarGeometria();
}

/* ---------- Pestañas de la barra lateral ---------- */

const PESTANAS = Object.freeze(['fisica', 'circuitos', 'geometria']);

function mostrarPestana(nombre) {
    const elegida = PESTANAS.includes(nombre) ? nombre : PESTANAS[0];
    document.querySelectorAll('.pestana').forEach((boton) => boton.classList.toggle('activa', boton.dataset.pestana === elegida));
    document.querySelectorAll('.lista-recursos').forEach((lista) => { lista.hidden = lista.dataset.pestana !== elegida; });
}

/* ---------- Campos de la barra superior ---------- */

function alCambiarValor() {
    const pieza = piezaSeleccionada();
    const c = pieza && conversion(pieza);
    const mostrado = Number(entradas.valor.value);
    if (!c || !Number.isFinite(mostrado)) return;
    const interno = mostrado / c.factor;
    const regla = VALORES[pieza.tipo];
    if (interno < regla.min || interno > regla.max || (regla.entero && !Number.isInteger(interno))) return;
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

// Voltea la pieza (solo las que se pueden poner en espejo: la rampa y la pista curva)
function voltearPieza() {
    const pieza = piezaSeleccionada();
    if (!pieza || !PIEZAS[pieza.tipo].espejable) return;
    cambiarPieza(pieza.id, { espejo: !pieza.espejo });
    actualizarConexiones({ registrar: true });
}

function alCambiarAngulo() {
    const pieza = piezaSeleccionada();
    const grados = Number(entradas.angulo.value);
    if (!pieza || pieza.angulo === null || !Number.isFinite(grados) || Math.abs(grados) > ANGULO_MAXIMO) return;
    cambiarPieza(pieza.id, { angulo: grados });
}

// Nombre de la pieza (por ejemplo "barra") para que la solución paso a paso la pueda marcar. Solo letras, números y _
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
        alDibujar: ponerTransform,
        alResolverCircuito: mostrarCircuito,
        alMoverProyectiles: moverProyectiles,
        alMoverCuerdas: moverCuerdasDePolea
    });
    reflejarSimulacion();
}

function detenerSimulacion() {
    if (!simulacion) return;
    simulacion.detener();
    simulacion = null;
    piezas.forEach(actualizarNodo); // al detener, todo vuelve a su lugar
    limpiarEfectos();
    reflejarSimulacion();
}

const alternarSimulacion = () => (simulacion ? detenerSimulacion() : iniciarSimulacion());

// En la solución, el botón "Empezar" arranca el paso a paso (solucion-pasos.js); en el editor, simula
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
    // Si sueltas una pieza nueva fuera del lienzo, no se agrega
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
        rotarPieza(seleccionada, evento.shiftKey ? -1 : 1);
    } else if (evento.key === 'Escape') {
        seleccionar(null);
    }
}

/* ---------- Inicio ---------- */

function crearRecurso([tipo, definicion]) {
    const muestra = { tipo, rotacion: 0, largo: definicion.largoInicial, valor: VALORES[tipo]?.inicial, angulo: definicion.anguloInicial };
    const { svg, zona: [x, y, ancho, alto] } = dibujoDe(muestra);
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
    const recursosDe = (grupo) => Object.entries(PIEZAS).filter(([, definicion]) => (definicion.grupo || 'fisica') === grupo).map(crearRecurso);
    listaRecursos.replaceChildren(...recursosDe('fisica'));
    $('listaCircuitos').replaceChildren(...recursosDe('circuitos'));
    dibujarSuelo();
    window.addEventListener('resize', dibujarSuelo);
    lienzo.addEventListener('pointerdown', () => { if (!simulacion) seleccionar(null); }); // clic en una zona vacía: se quita la selección
    window.addEventListener('pointermove', alMoverPuntero);
    window.addEventListener('pointerup', alSoltarPuntero);
    document.addEventListener('keydown', alPresionarTecla);
    entradas.valor.addEventListener('input', alCambiarValor);
    entradas.texto.addEventListener('input', alCambiarTexto);
    entradas.largo.addEventListener('input', alCambiarLargo);
    entradas.angulo.addEventListener('input', alCambiarAngulo);
    entradas.nombre.addEventListener('input', alCambiarNombre);
    entradas.unidad.addEventListener('change', alCambiarUnidad);
    botones.simular.addEventListener('click', alPresionarBotonPrincipal);
    botones.rotarIzquierda.addEventListener('click', () => rotarPieza(seleccionada, -1));
    botones.rotarDerecha.addEventListener('click', () => rotarPieza(seleccionada, 1));
    botones.eliminar.addEventListener('click', () => { if (seleccionada !== null) eliminarPieza(seleccionada); });
    botones.limpiar.addEventListener('click', limpiarTodo);
    botones.espejo.addEventListener('click', voltearPieza);
    document.querySelectorAll('.pestana').forEach((boton) => boton.addEventListener('click', () => mostrarPestana(boton.dataset.pestana)));
    mostrarPestana(parametrosUrl.get('pestana'));
    seleccionar(null);
}

iniciar();

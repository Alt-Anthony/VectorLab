// Lo que se ve solo mientras se simula, encima de las piezas:
//   · en los circuitos, la corriente moviéndose por los cables, la lectura de cada componente y el brillo de los focos;
//   · en el lanzador, el proyectil, su recorrido y, al caer, el alcance y el tiempo de vuelo; también el recorrido
//     de las partículas en un campo magnético y de las pelotas, y las cuerdas de las poleas moviéndose.
// Además dibuja siempre (no solo al simular) las líneas de campo de las cargas eléctricas, en capaCampos.
// motor-fisica.js avisa con alResolverCircuito (una vez al empezar) y alMoverProyectiles (en cada cuadro).
// Usa de editor-lienzo.js: $, SVG_NS, lienzo, nodos y capaPiezas; de cargas.js, lineasDeCampo. Los textos se ponen con textContent.

const capaSimulacion = $('capaSimulacion');
const capaCampos = $('capaCampos');
const LARGO_FLECHITA = 7; // flechitas que marcan hacia dónde va el campo
const POTENCIA_BRILLO_TOTAL = 20;   // W: con esta potencia (o más) un foco brilla al máximo
const CORRIENTE_MINIMA = 1e-6;      // A: menos que esto es "no pasa corriente"
const SEPARACION_LECTURA = 24;      // px del componente a su lectura
const RADIO_PROYECTIL = 7;

const formatoElectrico = (numero) => Number(numero.toFixed(2)).toLocaleString('es');

function nodoEfecto(etiqueta, atributos, texto) {
    const nodo = document.createElementNS(SVG_NS, etiqueta);
    Object.entries(atributos).forEach(([nombre, valor]) => nodo.setAttribute(nombre, valor));
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

/* ---------- Circuitos ---------- */

// Qué muestra cada componente: los medidores su medida, el capacitor su carga y los demás su corriente
function lecturaDe({ tipo, corriente, voltaje, carga }) {
    if (tipo === 'cable') return null;
    if (tipo === 'voltimetro') return `${formatoElectrico(Math.abs(voltaje))} V`;
    if (tipo === 'capacitor') return `${formatoElectrico(Math.abs(carga))} μC`;
    return `${formatoElectrico(Math.abs(corriente))} A`;
}

// La lectura va debajo del componente si está echado y a su izquierda si está parado
function posicionDeLectura({ desde, hasta }) {
    const medio = { x: (desde.x + hasta.x) / 2, y: (desde.y + hasta.y) / 2 };
    const parado = desde.x === hasta.x;
    return parado
        ? { x: medio.x - SEPARACION_LECTURA, y: medio.y + 4, 'text-anchor': 'end' }
        : { x: medio.x, y: medio.y + SEPARACION_LECTURA + 4, 'text-anchor': 'middle' };
}

// La corriente sale del + de la batería: en los cables se dibuja moviéndose en ese sentido
function flujoDe({ desde, hasta, corriente }) {
    const clase = corriente < 0 ? 'flujo al-reves' : 'flujo';
    return nodoEfecto('line', { x1: desde.x, y1: desde.y, x2: hasta.x, y2: hasta.y, class: clase });
}

function encenderFoco({ id, potencia }) {
    const brillo = nodos.get(id)?.querySelector('.brillo');
    if (brillo) brillo.style.opacity = String(Math.min(1, potencia / POTENCIA_BRILLO_TOTAL));
}

function mostrarCircuito(resultado) {
    const grupo = nodoEfecto('g', { class: 'efectos-circuito' });
    resultado.elementos.forEach((elemento) => {
        const pasaCorriente = Math.abs(elemento.corriente) > CORRIENTE_MINIMA;
        if (elemento.tipo === 'cable' && pasaCorriente) grupo.append(flujoDe(elemento));
        if (elemento.tipo === 'foco') encenderFoco(elemento);
        const lectura = lecturaDe(elemento);
        if (lectura) grupo.append(nodoEfecto('text', { ...posicionDeLectura(elemento), class: 'lectura' }, lectura));
    });
    if (resultado.error && resultado.error !== 'Falta una batería') {
        grupo.append(nodoEfecto('text', { x: 20, y: 30, class: 'lectura aviso' }, resultado.error));
    }
    capaSimulacion.querySelector('.efectos-circuito')?.remove();
    capaSimulacion.append(grupo);
}

/* ---------- Proyectiles ---------- */

function moverProyectiles(lista) {
    const grupo = nodoEfecto('g', { class: 'efectos-proyectiles' });
    lista.forEach(({ x, y, recorrido, enElSuelo, alcance, tiempo, soloRecorrido, clase }) => {
        const puntos = recorrido.map((p) => `${p.x},${p.y}`).join(' ');
        if (soloRecorrido) {
            grupo.append(nodoEfecto('polyline', { points: puntos, class: 'recorrido rastro' })); // la pelota ya se mueve sola
            return;
        }
        grupo.append(
            nodoEfecto('polyline', { points: puntos, class: 'recorrido' }),
            nodoEfecto('circle', { cx: x, cy: y, r: RADIO_PROYECTIL, class: clase ? `proyectil ${clase}` : 'proyectil' })
        );
        if (enElSuelo) {
            const resumen = `x = ${formatoElectrico(alcance)} m · t = ${formatoElectrico(tiempo)} s`;
            grupo.append(nodoEfecto('text', { x, y: y - 16, class: 'lectura-proyectil' }, resumen));
        }
    });
    capaSimulacion.querySelector('.efectos-proyectiles')?.remove();
    capaSimulacion.append(grupo);
}

/* ---------- Cuerdas de las poleas ---------- */

function moverCuerdasDePolea(tramos) {
    const grupo = nodoEfecto('g', { class: 'efectos-cuerdas' });
    tramos.forEach(({ desde, hasta }) => grupo.append(nodoEfecto('line', { x1: desde.x, y1: desde.y, x2: hasta.x, y2: hasta.y, class: 'cuerda-dinamica' })));
    capaSimulacion.querySelector('.efectos-cuerdas')?.remove();
    capaSimulacion.append(grupo);
}

/* ---------- Líneas de campo eléctrico (siempre visibles) ---------- */

// Una flechita en la mitad de la línea, apuntando hacia donde va el campo
function flechitaDe(puntos) {
    const i = Math.floor(puntos.length / 2);
    const [a, b] = [puntos[i - 1] || puntos[i], puntos[i + 1] || puntos[i]];
    const largo = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const [ux, uy] = [(b.x - a.x) / largo, (b.y - a.y) / largo];
    const punta = puntos[i];
    const base = { x: punta.x - ux * LARGO_FLECHITA, y: punta.y - uy * LARGO_FLECHITA };
    const lados = `${base.x - uy * 4},${base.y + ux * 4} ${base.x + uy * 4},${base.y - ux * 4}`;
    return nodoEfecto('polygon', { points: `${punta.x},${punta.y} ${lados}`, class: 'flechita-campo' });
}

function dibujarLineasDeCampo(piezas) {
    const cargas = piezas.filter((p) => p.tipo === 'carga');
    if (cargas.length === 0) {
        capaCampos.replaceChildren();
        return;
    }
    const { width, height } = lienzo.getBoundingClientRect();
    const lineas = lineasDeCampo(cargas, { ancho: width, alto: height }).filter((puntos) => puntos.length > 2);
    capaCampos.replaceChildren(...lineas.flatMap((puntos) => [
        nodoEfecto('polyline', { points: puntos.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '), class: 'linea-campo' }),
        flechitaDe(puntos)
    ]));
}

/* ---------- Al detener ---------- */

function limpiarEfectos() {
    capaSimulacion.replaceChildren();
    capaPiezas.querySelectorAll('.brillo').forEach((brillo) => { brillo.style.opacity = '0'; });
}

// Electricidad y magnetismo del laboratorio:
//   · Líneas de campo eléctrico: salen de las cargas positivas y llegan a las negativas. En cada punto siguen
//     la dirección del campo E = Σ k·q / r² (solo importa la dirección, por eso no se usa el valor de k).
//   · Partículas en un campo magnético: la fuerza F = q·v × B no cambia la rapidez, solo la dirección, así que
//     la partícula gira en círculo mientras está dentro del campo (ω = q·B/m) y sigue derecho afuera.
//     Campo con valor positivo: entra a la pantalla (⊗); negativo: sale (⊙).
// No dibuja nada (eso lo hace efectos-simulacion.js) y no usa Matter.js.

const RADIO_CARGA = 14;            // px: tamaño del dibujo de una carga
const PASO_LINEA = 4;              // px que avanza cada tramo de una línea de campo
const MAXIMO_TRAMOS = 600;
const LINEAS_POR_CARGA = 12;       // las que salen de la carga más grande; las demás, en proporción
const MARGEN_LINEAS = 200;         // px: una línea que se aleja así del lienzo ya no se sigue
const OMEGA_POR_TESLA = 1;         // rad/s que gira una partícula en un campo de 1 T
const PX_POR_METRO_PARTICULA = 20; // en el lienzo, 1 m/s de la partícula son 20 px/s
const PASO_PARTICULA = 1 / 240;    // s: paso pequeño para que el círculo salga redondo

function campoElectrico(punto, cargas) {
    return cargas.reduce((total, { x, y, valor }) => {
        const dx = punto.x - x;
        const dy = punto.y - y;
        const r2 = dx * dx + dy * dy;
        const r3 = r2 * Math.sqrt(r2);
        return r3 > 0 ? { x: total.x + (valor * dx) / r3, y: total.y + (valor * dy) / r3 } : total;
    }, { x: 0, y: 0 });
}

// Sigue una línea de campo desde "inicio" (sentido 1: a favor del campo; -1: en contra)
function seguirLinea(inicio, cargas, sentido, { ancho, alto }) {
    const puntos = [inicio];
    let actual = inicio;
    for (let i = 0; i < MAXIMO_TRAMOS; i += 1) {
        const e = campoElectrico(actual, cargas);
        const largo = Math.hypot(e.x, e.y);
        if (largo === 0) break;
        actual = { x: actual.x + (sentido * PASO_LINEA * e.x) / largo, y: actual.y + (sentido * PASO_LINEA * e.y) / largo };
        puntos.push(actual);
        const llego = cargas.some((c) => Math.hypot(actual.x - c.x, actual.y - c.y) < RADIO_CARGA * 0.8);
        const seFue = actual.x < -MARGEN_LINEAS || actual.y < -MARGEN_LINEAS || actual.x > ancho + MARGEN_LINEAS || actual.y > alto + MARGEN_LINEAS;
        if (llego || seFue) break;
    }
    return puntos;
}

// Las líneas salen de las cargas positivas (o, si solo hay negativas, llegan a ellas desde lejos)
function lineasDeCampo(cargas, limites) {
    const validas = cargas.filter((c) => Number.isFinite(c.valor) && c.valor !== 0);
    const positivas = validas.filter((c) => c.valor > 0);
    const origenes = positivas.length > 0 ? positivas : validas;
    const sentido = positivas.length > 0 ? 1 : -1;
    const mayor = Math.max(...origenes.map((c) => Math.abs(c.valor)), 0);
    return origenes.flatMap((carga) => {
        const cantidad = Math.max(4, Math.round((LINEAS_POR_CARGA * Math.abs(carga.valor)) / mayor));
        return Array.from({ length: cantidad }, (_, i) => {
            const angulo = (2 * Math.PI * (i + 0.5)) / cantidad;
            const inicio = { x: carga.x + RADIO_CARGA * Math.cos(angulo), y: carga.y + RADIO_CARGA * Math.sin(angulo) };
            return seguirLinea(inicio, validas, sentido, limites);
        });
    });
}

/* ---------- Partículas en un campo magnético ---------- */

const signoDeParticula = (tipo) => (tipo === 'electron' ? -1 : 1);

// El campo es un cuadrado de lado "largo" centrado en su posición
function campoEn({ x, y }, campos) {
    const campo = campos.find((c) => Math.abs(x - c.x) <= c.largo / 2 && Math.abs(y - c.y) <= c.largo / 2);
    return campo ? campo.valor : 0;
}

// Gira un vector (en el lienzo, con y hacia abajo) "angulo" radianes en contra de las agujas del reloj
const girarEnPantalla = ({ x, y }, angulo) => ({
    x: x * Math.cos(angulo) + y * Math.sin(angulo),
    y: -x * Math.sin(angulo) + y * Math.cos(angulo)
});

// Un paso de dt segundos: media vuelta de la velocidad, avanza, otra media vuelta (así el círculo se cierra bien)
function pasoDeParticula(estado, campos, dt) {
    const omega = OMEGA_POR_TESLA * campoEn(estado, campos) * estado.signo;
    const v1 = girarEnPantalla(estado.v, (omega * dt) / 2);
    const posicion = { x: estado.x + v1.x * dt, y: estado.y + v1.y * dt };
    return { ...estado, ...posicion, v: girarEnPantalla(v1, (omega * dt) / 2) };
}

// Estado inicial de una partícula: rapidez (m/s) en "valor" y dirección (grados) en "angulo"
function estadoDeParticula({ x, y, valor, angulo, tipo }) {
    const rapidez = valor * PX_POR_METRO_PARTICULA;
    const rad = (angulo * Math.PI) / 180;
    return { x, y, signo: signoDeParticula(tipo), v: { x: rapidez * Math.cos(rad), y: -rapidez * Math.sin(rad) } };
}

// Dónde está la partícula después de "segundos" (empezando desde la pieza)
function moverParticula(particula, campos, segundos) {
    let estado = estadoDeParticula(particula);
    for (let t = 0; t < segundos - 1e-9; t += PASO_PARTICULA) {
        estado = pasoDeParticula(estado, campos, Math.min(PASO_PARTICULA, segundos - t));
    }
    return estado;
}

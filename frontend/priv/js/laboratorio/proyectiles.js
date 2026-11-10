// Lanzador de proyectiles del laboratorio: dónde está el proyectil en cada instante (tiro parabólico).
// No usa Matter.js: se calcula con las fórmulas del movimiento parabólico, con g = 10 m/s² (G de dibujo-piezas.js).
//   x = v·cos(θ)·t        y = v·sen(θ)·t − g·t²/2
// En el lienzo, 10 px son 1 m (medio cuadro), así una torre de 20 m o un alcance de 50 m caben en la pantalla.

const PX_POR_METRO_PROYECTIL = 10;

// Cuánto tarda en llegar al suelo si sale a "alturaM" metros sobre él: alturaM + vy·t − g·t²/2 = 0
const tiempoDeVuelo = (vy, alturaM) => (vy + Math.sqrt(vy * vy + 2 * G * Math.max(alturaM, 0))) / G;

// lanzador: { x, y, valor (rapidez en m/s), angulo (grados sobre la horizontal) }
// Devuelve { x, y } en el lienzo, el tiempo y el alcance en metros, y si ya cayó al suelo
function posicionDeProyectil(lanzador, segundos, sueloY) {
    const rad = (lanzador.angulo * Math.PI) / 180;
    const vx = lanzador.valor * Math.cos(rad);
    const vy = lanzador.valor * Math.sin(rad);
    const vuelo = tiempoDeVuelo(vy, (sueloY - lanzador.y) / PX_POR_METRO_PROYECTIL);
    const tiempo = Math.min(segundos, vuelo);
    const alcance = vx * tiempo;
    const subida = vy * tiempo - (G * tiempo * tiempo) / 2;
    return {
        x: lanzador.x + alcance * PX_POR_METRO_PROYECTIL,
        y: lanzador.y - subida * PX_POR_METRO_PROYECTIL,
        tiempo,
        alcance,
        enElSuelo: segundos >= vuelo
    };
}

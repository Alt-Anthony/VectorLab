// Engranajes del laboratorio: cuáles encajan entre sí y a qué velocidad gira cada uno.
// Dos engranajes encajan si la distancia entre sus centros es la suma de sus radios: giran al revés y
// el que tiene menos dientes gira más rápido (ω₁·N₁ = ω₂·N₂). Si comparten el centro (el mismo eje), giran juntos.
// El engranaje que tiene un motor encima gira a velocidad constante; si no hay motor, gira el primero que se puso.
// Los discos (ruedas lisas) se portan igual: con el mismo eje giran juntos y si se tocan giran según sus radios.
// No usa Matter.js: los engranajes no chocan, solo giran. El radio sale de dibujo-piezas.js.
// Como el radio de un engranaje es proporcional a sus dientes, ω₁·r₁ = ω₂·r₂ vale para los dos.

const TOLERANCIA_ENGRANE = 8;     // px de diferencia permitidos para que dos engranajes encajen
const TOLERANCIA_EJE = 4;         // px: si los centros están así de cerca, comparten eje
const VUELTAS_POR_SEGUNDO = 0.25; // velocidad del engranaje que tiene el motor

const distanciaCentros = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const compartenEje = (a, b) => distanciaCentros(a, b) <= TOLERANCIA_EJE;
const radioDeRueda = (p) => (p.tipo === 'disco' ? p.valor : radioDeEngranaje(p.valor));
const encajan = (a, b) => Math.abs(distanciaCentros(a, b) - radioDeRueda(a) - radioDeRueda(b)) <= TOLERANCIA_ENGRANE;

const engranajesDe = (piezas) => piezas.filter((p) => (p.tipo === 'engranaje' || p.tipo === 'disco') && p.valor > 0);

// Los pares de engranajes que encajan (para marcar en verde dónde se tocan)
function engranesDe(piezas) {
    const engranajes = engranajesDe(piezas);
    return engranajes.flatMap((a, i) => engranajes.slice(i + 1).filter((b) => encajan(a, b)).map((b) => [a, b]));
}

// El punto donde se tocan dos engranajes que encajan
function puntoDeContacto(a, b) {
    const t = radioDeRueda(a) / (radioDeRueda(a) + radioDeRueda(b));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// Velocidad de cada engranaje en vueltas por segundo (positivo: como las agujas del reloj; negativo: al revés).
// Se recorre el tren desde los engranajes con motor: cada vecino recibe su velocidad una sola vez.
function calcularGiros(piezas) {
    const engranajes = engranajesDe(piezas);
    const motores = piezas.filter((p) => p.tipo === 'motor');
    const conMotor = engranajes.filter((e) => motores.some((m) => compartenEje(e, m)));
    const iniciales = conMotor.length > 0 ? conMotor : engranajes.slice(0, 1);
    const giros = new Map(iniciales.map((e) => [e.id, VUELTAS_POR_SEGUNDO]));
    const pendientes = [...iniciales];
    while (pendientes.length > 0) {
        const actual = pendientes.shift();
        const velocidad = giros.get(actual.id);
        engranajes.forEach((otro) => {
            if (giros.has(otro.id)) return;
            if (compartenEje(actual, otro)) {
                giros.set(otro.id, velocidad);
            } else if (encajan(actual, otro)) {
                giros.set(otro.id, (-velocidad * radioDeRueda(actual)) / radioDeRueda(otro));
            } else {
                return;
            }
            pendientes.push(otro);
        });
    }
    return giros;
}

// Cómo se dibuja cada componente de la pestaña Circuitos: batería, resistencia, foco, capacitor, cable,
// amperímetro y voltímetro. Todos miden 80 px de punta a punta (sus terminales están a 40 px del centro),
// salvo el cable, que va desde su origen hasta su largo. Giran de a 90° para que sus puntas caigan en la cuadrícula.
// El valor (Ω, V, μF) va en un grupo .sin-giro al costado del componente, para que siempre se lea derecho.
// dibujo-piezas.js junta estas piezas con las de física en PIEZAS; circuitos.js calcula la corriente.

const COLOR_CIRCUITO = '#1f2937';
const MEDIO_COMPONENTE = 40;

const esVertical = (rotacion) => Math.round((rotacion || 0) / 90) % 2 !== 0;

// El valor va arriba si el componente está echado y a la derecha si está parado (el número lo pone el editor)
function textoDeComponente(rotacion, contenido) {
    const posicion = esVertical(rotacion) ? 'x="22" y="4" text-anchor="start"' : 'x="0" y="-20" text-anchor="middle"';
    return `<g class="sin-giro"><text class="valor" ${posicion} font-size="12" font-weight="600" fill="${COLOR_CIRCUITO}">${contenido}</text></g>`;
}

// Los dos cablecitos que salen del componente hasta sus terminales
const patasDeComponente = (desde) =>
    `<line x1="${-MEDIO_COMPONENTE}" y1="0" x2="${-desde}" y2="0" stroke="${COLOR_CIRCUITO}" stroke-width="2"/>
     <line x1="${desde}" y1="0" x2="${MEDIO_COMPONENTE}" y2="0" stroke="${COLOR_CIRCUITO}" stroke-width="2"/>`;

// El polo positivo (raya larga) queda a la derecha, del lado de la terminal de +40
const dibujarBateria = ({ rotacion }) =>
    `${patasDeComponente(6)}
     <line x1="6" y1="-16" x2="6" y2="16" stroke="${COLOR_CIRCUITO}" stroke-width="2"/>
     <line x1="-6" y1="-8" x2="-6" y2="8" stroke="${COLOR_CIRCUITO}" stroke-width="5"/>
     <path d="M 14 -14 h 6 M 17 -17 v 6" stroke="#dc2626" stroke-width="1.5"/>
     ${textoDeComponente(rotacion, 'V')}`;

const dibujarResistencia = ({ rotacion }) =>
    `${patasDeComponente(24)}
     <polyline points="-24,0 -20,-8 -12,8 -4,-8 4,8 12,-8 20,8 24,0" fill="none" stroke="${COLOR_CIRCUITO}" stroke-width="2" stroke-linejoin="round"/>
     ${textoDeComponente(rotacion, 'R')}`;

// El brillo (amarillo, invisible al inicio) lo prende efectos-simulacion.js según la potencia del foco
const dibujarFoco = ({ rotacion }) =>
    `<circle class="brillo" r="24" fill="#fde047" opacity="0"/>
     ${patasDeComponente(14)}
     <circle r="14" fill="#ffffff" stroke="${COLOR_CIRCUITO}" stroke-width="2"/>
     <path d="M -9 -9 L 9 9 M -9 9 L 9 -9" stroke="${COLOR_CIRCUITO}" stroke-width="1.5"/>
     ${textoDeComponente(rotacion, 'R')}`;

const dibujarCapacitor = ({ rotacion }) =>
    `${patasDeComponente(5)}
     <line x1="-5" y1="-14" x2="-5" y2="14" stroke="${COLOR_CIRCUITO}" stroke-width="2.5"/>
     <line x1="5" y1="-14" x2="5" y2="14" stroke="${COLOR_CIRCUITO}" stroke-width="2.5"/>
     ${textoDeComponente(rotacion, 'C')}`;

// Amperímetro (A) y voltímetro (V): un círculo con su letra, siempre derecha
const dibujarMedidor = (letra) => () =>
    `${patasDeComponente(14)}
     <circle r="14" fill="#ffffff" stroke="${COLOR_CIRCUITO}" stroke-width="2"/>
     <g class="sin-giro"><text x="0" y="5" text-anchor="middle" font-size="14" font-weight="700" fill="${COLOR_CIRCUITO}">${letra}</text></g>`;

const dibujarCable = ({ largo }) =>
    `<line x1="0" y1="0" x2="${largo}" y2="0" stroke="${COLOR_CIRCUITO}" stroke-width="2.5" stroke-linecap="round"/>
     <circle r="2.5" fill="${COLOR_CIRCUITO}"/><circle cx="${largo}" r="2.5" fill="${COLOR_CIRCUITO}"/>`;

const ZONA_COMPONENTE = Object.freeze([-MEDIO_COMPONENTE, -16, 2 * MEDIO_COMPONENTE, 32]);

const componente = (nombre, svg) => ({ nombre, grupo: 'circuitos', pasoRotacion: 90, zona: ZONA_COMPONENTE, svg });

const PIEZAS_CIRCUITO = Object.freeze({
    bateria: componente('Batería', dibujarBateria),
    resistencia: componente('Resistencia', dibujarResistencia),
    foco: componente('Foco', dibujarFoco),
    capacitor: componente('Capacitor', dibujarCapacitor),
    amperimetro: componente('Amperímetro', dibujarMedidor('A')),
    voltimetro: componente('Voltímetro', dibujarMedidor('V')),
    cable: {
        nombre: 'Cable',
        grupo: 'circuitos',
        pasoRotacion: 90,
        largoInicial: 80,
        zona: ({ largo }) => [-4, -6, largo + 8, 12],
        svg: dibujarCable
    }
});

// Aquí están todas las piezas del laboratorio (techo, barra, cuerda, bloque, polea...) y cómo se dibuja cada una.
// Cada pieza se dibuja alrededor de su centro; la cota (línea de medida) empieza en su extremo izquierdo.
// Todas las medidas son múltiplos de 20, el tamaño de un cuadro, para que las piezas encajen en la cuadrícula.
// "zona" es el área de la pieza que se puede agarrar con el mouse: [x, y, ancho, alto].
// Los números y letras que se ven sobre las piezas los escribe editor-lienzo.js.
// La cota (línea de medida) se dibuja con dibujarCota de cota.js.
// Los componentes de circuito están en dibujo-circuitos.js y se juntan aquí en PIEZAS.

const COLOR_LINEA = '#1f2937';
const G = 10; // gravedad en m/s², la misma que usan los exámenes
const BASE_RAMPA = 240;   // largo de la base del plano inclinado (su alto depende del ángulo)
const PASO_DIENTE = 2;    // radio de un engranaje: 2 px por cada diente (10 dientes → radio 20)
const ALTO_DIENTE = 3;    // cuánto sobresale cada diente del círculo del engranaje

const ALTO_RECIPIENTE = 160;   // el recipiente mide esto de alto; su ancho es su "largo"
const NIVEL_LIQUIDO = 0.7;     // el líquido llena el 70 % del recipiente
const GROSOR_PARED = 8;
const RADIO_POLEA_CUERDA = 30; // la polea con cuerda: las dos puntas cuelgan a 30 px del centro

// El ángulo de la rampa se mantiene entre 5° y 70° (si no, sería un piso o una pared)
const anguloDeRampa = (angulo) => Math.min(70, Math.max(5, Math.abs(Number(angulo) || 30)));
const altoDeRampa = (angulo) => BASE_RAMPA * Math.tan((anguloDeRampa(angulo) * Math.PI) / 180);
const radioDeEngranaje = (dientes) => dientes * PASO_DIENTE;

// Las rayitas que se dibujan en un techo o un piso para indicar que está fijo (hacia arriba -1, hacia abajo 1)
function rayas(desde, hasta, y, sentido) {
    const lineas = [];
    for (let x = desde; x < hasta; x += 12) {
        lineas.push(`<line x1="${x}" y1="${y}" x2="${x + 10}" y2="${y + 12 * sentido}" stroke="${COLOR_LINEA}" stroke-width="1.5"/>`);
    }
    return lineas.join('');
}

// Marcas sobre la barra cada 20 px (un cuadro), para poder contar distancias
function marcasDeBarra(mitad) {
    const marcas = [];
    for (let x = -mitad + 20; x < mitad; x += 20) {
        marcas.push(`<line x1="${x}" y1="-6" x2="${x}" y2="${x === 0 ? 2 : -1}" stroke="#7c4a1e" stroke-width="1"/>`);
    }
    return marcas.join('');
}

// El plano inclinado sube de izquierda a derecha (en espejo, de derecha a izquierda); su origen está en el
// medio de la base. El ángulo va en "angulo" y el rozamiento μ en "valor" (ese número lo escribe el editor)
function dibujarRampa({ angulo, espejo }) {
    const lado = espejo ? -1 : 1;
    const grados = anguloDeRampa(angulo);
    const alto = altoDeRampa(grados);
    const esquina = (-BASE_RAMPA / 2) * lado; // donde está el ángulo
    const radioArco = 34;
    const rad = (grados * Math.PI) / 180;
    const finArco = { x: esquina + lado * radioArco * Math.cos(rad), y: -radioArco * Math.sin(rad) };
    return `<polygon points="${esquina},0 ${-esquina},0 ${-esquina},${-alto}" fill="#e5e7eb" stroke="${COLOR_LINEA}" stroke-width="1.5" stroke-linejoin="round"/>
            ${rayas(-BASE_RAMPA / 2, BASE_RAMPA / 2, 0, 1)}
            <path d="M ${esquina + lado * radioArco} 0 A ${radioArco} ${radioArco} 0 0 ${espejo ? 1 : 0} ${finArco.x} ${finArco.y}" fill="none" stroke="${COLOR_LINEA}" stroke-width="1.2"/>
            <text x="${esquina + lado * (radioArco + 6)}" y="-5" text-anchor="${espejo ? 'end' : 'start'}" font-size="12" fill="${COLOR_LINEA}">${grados}°</text>
            <text class="valor" x="${-lado * 26}" y="${-alto / 2 - 14}" text-anchor="middle" font-size="12" fill="${COLOR_LINEA}">μ</text>`;
}

const zonaDeRampa = ({ angulo }) => [-BASE_RAMPA / 2, -altoDeRampa(angulo), BASE_RAMPA, altoDeRampa(angulo) + 12];

// Recipiente apoyado en el suelo (origen al medio del fondo), con líquido hasta el 70 %
function dibujarRecipiente({ largo }) {
    const mitad = largo / 2;
    const nivel = -ALTO_RECIPIENTE * NIVEL_LIQUIDO;
    const ondas = [];
    for (let y = nivel + 16; y < -GROSOR_PARED - 6; y += 18) ondas.push(`<line x1="${-mitad + 18}" y1="${y}" x2="${mitad - 18}" y2="${y}" stroke="#60a5fa" stroke-width="1" stroke-dasharray="10 8"/>`);
    return `<rect x="${-mitad + GROSOR_PARED}" y="${nivel}" width="${largo - 2 * GROSOR_PARED}" height="${-nivel - GROSOR_PARED}" fill="#bfdbfe" fill-opacity="0.7"/>
            ${ondas.join('')}
            <path d="M ${-mitad} ${-ALTO_RECIPIENTE} V 0 H ${mitad} V ${-ALTO_RECIPIENTE} h ${-GROSOR_PARED} V ${-GROSOR_PARED} H ${-mitad + GROSOR_PARED} V ${-ALTO_RECIPIENTE} Z" fill="#94a3b8" stroke="${COLOR_LINEA}" stroke-width="1"/>
            <text class="valor" x="0" y="${-ALTO_RECIPIENTE - 8}" text-anchor="middle" font-size="12" fill="${COLOR_LINEA}">ρ</text>`;
}

// Pista curva: un cuarto de circunferencia de radio "largo" que baja hasta su origen (en espejo, desde la derecha)
function dibujarPista({ largo, espejo }) {
    const lado = espejo ? -1 : 1;
    const inicio = -largo * lado;
    return `<path d="M ${inicio} ${-largo} A ${largo} ${largo} 0 0 ${espejo ? 1 : 0} 0 0 L ${inicio} 0 Z" fill="#e5e7eb" stroke="none"/>
            <path d="M ${inicio} ${-largo} A ${largo} ${largo} 0 0 ${espejo ? 1 : 0} 0 0" fill="none" stroke="${COLOR_LINEA}" stroke-width="2.5"/>
            ${rayas(Math.min(inicio, 0), Math.max(inicio, 0), 0, 1)}`;
}

// Polea con cuerda (máquina de Atwood): la cuerda pasa por la polea y cuelga a los dos lados hasta "largo"
const dibujarPoleaConCuerda = ({ largo }) =>
    `<rect x="-8" y="-46" width="16" height="6" fill="#6b7280"/>
     <line x1="0" y1="-40" x2="0" y2="0" stroke="${COLOR_LINEA}" stroke-width="3"/>
     <line class="cuerda-de-polea" x1="${-RADIO_POLEA_CUERDA}" y1="0" x2="${-RADIO_POLEA_CUERDA}" y2="${largo}" stroke="#92400e" stroke-width="2.5"/>
     <line class="cuerda-de-polea" x1="${RADIO_POLEA_CUERDA}" y1="0" x2="${RADIO_POLEA_CUERDA}" y2="${largo}" stroke="#92400e" stroke-width="2.5"/>
     <circle r="${RADIO_POLEA_CUERDA}" fill="#e5e7eb" stroke="${COLOR_LINEA}" stroke-width="2"/>
     <circle r="4" fill="${COLOR_LINEA}"/>`;

// Disco liso de radio "valor" (en px, que se leen como cm): gira como los engranajes, sin dientes
const dibujarDisco = ({ valor }) =>
    `<circle r="${valor}" fill="#e0e7ff" stroke="${COLOR_LINEA}" stroke-width="1.5"/>
     <line x1="0" y1="0" x2="0" y2="${-valor + 2}" stroke="${COLOR_LINEA}" stroke-width="2"/>
     <circle r="3" fill="${COLOR_LINEA}"/>
     <g class="sin-giro"><text class="valor" x="0" y="${Math.min(valor * 0.55, 30) + 4}" text-anchor="middle" font-size="11" fill="${COLOR_LINEA}">R</text></g>`;

// Carga eléctrica: roja si es positiva y azul si es negativa (las líneas de campo las dibuja efectos-simulacion.js)
const dibujarCarga = ({ valor }) =>
    `<circle r="14" fill="${valor < 0 ? '#93c5fd' : '#fca5a5'}" stroke="${COLOR_LINEA}" stroke-width="1.5"/>
     <path d="M -6 0 H 6${valor < 0 ? '' : ' M 0 -6 V 6'}" stroke="${COLOR_LINEA}" stroke-width="2"/>
     <text class="valor" x="0" y="30" text-anchor="middle" font-size="11" fill="${COLOR_LINEA}">q</text>`;

// Campo magnético: un cuadrado de lado "largo" lleno de ⊗ (entra a la pantalla, valor positivo) o ⊙ (sale)
function dibujarCampo({ largo, valor }) {
    const mitad = largo / 2;
    const simbolos = [];
    for (let y = -mitad + 20; y < mitad - 5; y += 30) {
        for (let x = -mitad + 20; x < mitad - 5; x += 30) {
            const centro = valor < 0 ? `<circle cx="${x}" cy="${y}" r="1.8" fill="#7c3aed"/>` : `<path d="M ${x - 4} ${y - 4} L ${x + 4} ${y + 4} M ${x - 4} ${y + 4} L ${x + 4} ${y - 4}" stroke="#7c3aed" stroke-width="1.2"/>`;
            simbolos.push(`<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#7c3aed" stroke-width="1.2"/>${centro}`);
        }
    }
    return `<rect x="${-mitad}" y="${-mitad}" width="${largo}" height="${largo}" fill="#f5f3ff" fill-opacity="0.6" stroke="#7c3aed" stroke-width="1" stroke-dasharray="6 4"/>
            ${simbolos.join('')}
            <text class="valor" x="${-mitad + 6}" y="${-mitad - 6}" font-size="12" fill="#6d28d9">B</text>`;
}

// Protón (+) o electrón (−): la flecha muestra hacia dónde sale ("angulo") y el número su rapidez
const dibujarParticula = (signo, color) => ({ angulo }) =>
    `<g transform="rotate(${-Number(angulo)})"><line x1="12" y1="0" x2="34" y2="0" stroke="${color}" stroke-width="2.5"/>
     <polygon points="40,0 30,-5 30,5" fill="${color}"/></g>
     <circle r="10" fill="${color}" stroke="${COLOR_LINEA}" stroke-width="1"/>
     <path d="M -5 0 H 5${signo > 0 ? ' M 0 -5 V 5' : ''}" stroke="#ffffff" stroke-width="2"/>
     <text class="valor" x="0" y="26" text-anchor="middle" font-size="11" fill="${COLOR_LINEA}">v</text>`;

// Vector solo para dibujar (v, B, A... con su flechita encima): apunta hacia arriba y gira; su nombre queda junto a la punta y derecho
function dibujarVector({ largo, rotacion }) {
    const rad = ((rotacion || 0) * Math.PI) / 180;
    const nombre = { x: Math.sin(rad) * (largo + 14), y: -Math.cos(rad) * (largo + 14) };
    return `<line x1="0" y1="0" x2="0" y2="${-largo + 12}" stroke="#2563eb" stroke-width="2.5"/>
            <polygon points="0,${-largo} -6,${-largo + 13} 6,${-largo + 13}" fill="#2563eb"/>
            <g class="sin-giro"><text class="texto" x="${nombre.x}" y="${nombre.y + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#2563eb">v</text>
            <path d="M ${nombre.x - 6} ${nombre.y - 10} h 12 m -3 -3 l 3 3 l -3 3" fill="none" stroke="#2563eb" stroke-width="1.5"/></g>`;
}

// Engranaje: un diente por cada "valor", con una raya para ver cómo gira.
// El número de dientes va en un grupo .sin-giro, que el editor mantiene derecho aunque el engranaje gire
function dibujarEngranaje({ valor }) {
    const dientes = Math.round(valor);
    const radio = radioDeEngranaje(dientes);
    const paso = (2 * Math.PI) / dientes;
    const punto = (r, angulo) => `${(r * Math.cos(angulo)).toFixed(1)},${(r * Math.sin(angulo)).toFixed(1)}`;
    const contorno = [];
    for (let i = 0; i < dientes; i += 1) {
        const a = i * paso;
        contorno.push(
            punto(radio - ALTO_DIENTE, a),
            punto(radio + ALTO_DIENTE, a + paso * 0.15),
            punto(radio + ALTO_DIENTE, a + paso * 0.45),
            punto(radio - ALTO_DIENTE, a + paso * 0.6)
        );
    }
    return `<polygon points="${contorno.join(' ')}" fill="#fcd34d" stroke="${COLOR_LINEA}" stroke-width="1.2" stroke-linejoin="round"/>
            <circle r="${radio * 0.55}" fill="#fde68a" stroke="${COLOR_LINEA}" stroke-width="1"/>
            <line x1="0" y1="${-radio * 0.55}" x2="0" y2="${-radio + ALTO_DIENTE + 1}" stroke="${COLOR_LINEA}" stroke-width="2"/>
            <g class="sin-giro"><text class="valor" x="0" y="4" text-anchor="middle" font-size="11" font-weight="700" fill="${COLOR_LINEA}">N</text></g>`;
}

const zonaDeEngranaje = ({ valor }) => {
    const r = radioDeEngranaje(Math.round(valor)) + ALTO_DIENTE + 1;
    return [-r, -r, 2 * r, 2 * r];
};

// El resorte: como la cuerda (mide 80 px y se estira igual al simular), pero en zigzag
function dibujarResorte() {
    const vueltas = [];
    for (let i = 0; i <= 8; i += 1) vueltas.push(`${i % 2 === 0 ? -8 : 8},${-30 + i * 7.5}`);
    return `<polyline points="0,-40 0,-30 ${vueltas.join(' ')} 0,30 0,40" fill="none" stroke="#475569" stroke-width="2" stroke-linejoin="round"/>`;
}

// El edificio se apoya en el suelo: su origen está al medio de la base y su alto es "largo"
function dibujarEdificio({ largo }) {
    const ventanas = [];
    for (let y = -largo + 14; y < -14; y += 30) {
        ventanas.push(`<rect x="-20" y="${y}" width="12" height="14" fill="#e0f2fe"/><rect x="8" y="${y}" width="12" height="14" fill="#e0f2fe"/>`);
    }
    return `<rect x="-30" y="${-largo}" width="60" height="${largo}" fill="#cbd5e1" stroke="${COLOR_LINEA}" stroke-width="1.5"/>${ventanas.join('')}`;
}

// El lanzador dispara desde la boca del cañón, que está en su origen; el cañón apunta según su ángulo
function dibujarLanzador({ angulo }) {
    return `<circle cx="-22" cy="10" r="10" fill="#94a3b8" stroke="${COLOR_LINEA}" stroke-width="1.5"/>
            <g transform="rotate(${-angulo})"><rect x="-38" y="-6" width="38" height="12" rx="3" fill="#475569" stroke="${COLOR_LINEA}" stroke-width="1"/></g>
            <text x="-22" y="-16" text-anchor="middle" font-size="11" fill="${COLOR_LINEA}">${Number(angulo)}°</text>
            <text class="valor" x="-22" y="34" text-anchor="middle" font-size="11" font-weight="600" fill="${COLOR_LINEA}">v</text>`;
}

const PIEZAS = Object.freeze({
    techo: {
        nombre: 'Techo',
        zona: [-100, -14, 200, 26],
        svg: `<rect x="-100" y="0" width="200" height="8" fill="#6b7280"/>${rayas(-100, 100, 0, -1)}`
    },
    piso: {
        nombre: 'Piso',
        zona: [-100, -10, 200, 36],
        svg: `<rect x="-100" y="-8" width="200" height="8" fill="#6b7280"/>${rayas(-100, 100, 0, 1)}
              <text class="valor" x="0" y="26" text-anchor="middle" font-size="11" fill="${COLOR_LINEA}">μ</text>`
    },
    rampa: {
        nombre: 'Plano inclinado',
        anguloInicial: 30,
        espejable: true,
        zona: zonaDeRampa,
        svg: dibujarRampa
    },
    pista: {
        nombre: 'Pista curva',
        largoInicial: 160,
        espejable: true,
        pasoRotacion: 0,
        zona: ({ largo, espejo }) => [espejo ? 0 : -largo, -largo, largo, largo + 12],
        svg: dibujarPista
    },
    recipiente: {
        nombre: 'Recipiente con líquido',
        largoInicial: 240,
        pasoRotacion: 0,
        zona: ({ largo }) => [-largo / 2, -ALTO_RECIPIENTE - 20, largo, ALTO_RECIPIENTE + 20],
        svg: dibujarRecipiente
    },
    barra: {
        nombre: 'Barra',
        zona: [-120, -10, 240, 20],
        svg: `<rect x="-120" y="-6" width="240" height="12" rx="2" fill="#d6a96b" stroke="#7c4a1e" stroke-width="1.5"/>${marcasDeBarra(120)}`
    },
    edificio: {
        nombre: 'Edificio',
        largoInicial: 200,
        zona: ({ largo }) => [-30, -largo, 60, largo],
        svg: dibujarEdificio
    },
    apoyo: {
        nombre: 'Apoyo',
        zona: [-26, -22, 52, 48],
        svg: `<polygon points="0,-20 -18,20 18,20" fill="#9ca3af" stroke="${COLOR_LINEA}" stroke-width="1.5"/>${rayas(-24, 24, 20, 1)}`
    },
    articulacion: {
        nombre: 'Articulación',
        zona: [-12, -12, 24, 24],
        svg: `<circle r="8" fill="#ffffff" stroke="${COLOR_LINEA}" stroke-width="2"/><circle r="2.5" fill="${COLOR_LINEA}"/>`
    },
    cuerda: {
        nombre: 'Cuerda',
        zona: [-8, -40, 16, 80],
        svg: '<line x1="0" y1="-40" x2="0" y2="40" stroke="#92400e" stroke-width="2.5" stroke-linecap="round"/>'
    },
    resorte: {
        nombre: 'Resorte',
        zona: [-10, -40, 20, 80],
        svg: dibujarResorte()
    },
    bloque: {
        nombre: 'Bloque',
        zona: [-22, -22, 44, 44],
        svg: `<rect x="-20" y="-20" width="40" height="40" fill="#93c5fd" stroke="${COLOR_LINEA}" stroke-width="1.5"/>
              <text class="valor" x="0" y="4" text-anchor="middle" font-size="12" fill="${COLOR_LINEA}">m</text>`
    },
    carrito: {
        nombre: 'Carrito',
        zona: [-32, -16, 64, 34],
        svg: `<rect x="-30" y="-14" width="60" height="20" rx="3" fill="#86efac" stroke="${COLOR_LINEA}" stroke-width="1.5"/>
              <circle cx="-18" cy="10" r="7" fill="#374151"/><circle cx="18" cy="10" r="7" fill="#374151"/>
              <text class="valor" x="0" y="0" text-anchor="middle" font-size="11" fill="${COLOR_LINEA}">m</text>`
    },
    pelota: {
        nombre: 'Pelota',
        zona: [-16, -16, 32, 32],
        svg: `<circle r="15" fill="#f87171" stroke="${COLOR_LINEA}" stroke-width="1.5"/>
              <path d="M -15 0 Q 0 -8 15 0" fill="none" stroke="#ffffff" stroke-width="2"/>
              <text class="valor" x="0" y="10" text-anchor="middle" font-size="9" fill="${COLOR_LINEA}">m</text>`
    },
    lanzador: {
        nombre: 'Lanzador',
        anguloInicial: 30,
        zona: [-44, -30, 52, 70],
        svg: dibujarLanzador
    },
    polea: {
        nombre: 'Polea',
        zona: [-24, -48, 48, 72],
        svg: `<rect x="-8" y="-46" width="16" height="6" fill="#6b7280"/>
              <line x1="0" y1="-40" x2="0" y2="0" stroke="${COLOR_LINEA}" stroke-width="3"/>
              <circle r="20" fill="#e5e7eb" stroke="${COLOR_LINEA}" stroke-width="2"/>
              <circle r="4" fill="${COLOR_LINEA}"/>`
    },
    polea_cuerda: {
        nombre: 'Polea con cuerda',
        largoInicial: 120,
        zona: ({ largo }) => [-RADIO_POLEA_CUERDA - 4, -48, 2 * RADIO_POLEA_CUERDA + 8, largo + 52],
        svg: dibujarPoleaConCuerda
    },
    disco: {
        nombre: 'Disco',
        zona: ({ valor }) => [-valor - 2, -valor - 2, 2 * valor + 4, 2 * valor + 4],
        svg: dibujarDisco
    },
    engranaje: {
        nombre: 'Engranaje',
        zona: zonaDeEngranaje,
        svg: dibujarEngranaje
    },
    motor: {
        nombre: 'Motor',
        zona: [-12, -12, 24, 24],
        svg: `<circle r="10" fill="#f59e0b" stroke="${COLOR_LINEA}" stroke-width="1.5"/>
              <path d="M 5.5 -3 A 6 6 0 1 0 5 3.5" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
              <polygon points="2.5,-6 8.5,-4.5 5,0.5" fill="#ffffff"/>`
    },
    fuerza: {
        nombre: 'Fuerza',
        zona: [-12, -32, 30, 64],
        svg: `<line x1="0" y1="30" x2="0" y2="-20" stroke="#dc2626" stroke-width="3"/>
              <polygon points="0,-30 -7,-17 7,-17" fill="#dc2626"/>
              <text class="valor" x="10" y="-14" font-size="13" font-weight="700" fill="#dc2626">F</text>`
    },
    velocidad: {
        nombre: 'Velocidad',
        zona: [-12, -32, 30, 64],
        svg: `<line x1="0" y1="30" x2="0" y2="-20" stroke="#16a34a" stroke-width="3"/>
              <polygon points="0,-30 -7,-17 7,-17" fill="#16a34a"/>
              <text class="valor" x="10" y="-14" font-size="13" font-weight="700" fill="#16a34a">v</text>`
    },
    vector: {
        nombre: 'Vector',
        textoInicial: 'v',
        largoInicial: 80,
        zona: ({ largo }) => [-10, -largo, 20, largo],
        svg: dibujarVector
    },
    carga: {
        nombre: 'Carga eléctrica',
        zona: [-16, -16, 32, 52],
        svg: dibujarCarga
    },
    campo: {
        nombre: 'Campo magnético',
        largoInicial: 180,
        pasoRotacion: 0,
        zona: ({ largo }) => [-largo / 2, -largo / 2, largo, largo],
        svg: dibujarCampo
    },
    proton: {
        nombre: 'Protón',
        anguloInicial: 0,
        zona: [-12, -12, 24, 44],
        svg: dibujarParticula(1, '#dc2626')
    },
    electron: {
        nombre: 'Electrón',
        anguloInicial: 0,
        zona: [-12, -12, 24, 44],
        svg: dibujarParticula(-1, '#2563eb')
    },
    persona: {
        nombre: 'Persona',
        zona: [-16, -68, 32, 68],
        svg: `<circle cx="0" cy="-58" r="8" fill="#ffffff" stroke="${COLOR_LINEA}" stroke-width="2"/>
              <path d="M 0 -50 V -22 M -14 -42 H 14 M 0 -22 L -10 0 M 0 -22 L 10 0" fill="none" stroke="${COLOR_LINEA}" stroke-width="2.5" stroke-linecap="round"/>`
    },
    etiqueta: {
        nombre: 'Etiqueta',
        zona: [-14, -14, 28, 28],
        textoInicial: 'A',
        svg: `<text class="texto" x="0" y="6" text-anchor="middle" font-size="17" font-weight="700" fill="${COLOR_LINEA}">A</text>`
    },
    cota: {
        nombre: 'Cota',
        zona: ({ largo }) => [-4, -22, largo + 8, 30],
        textoInicial: '1 m',
        largoInicial: 80,
        svg: dibujarCota
    },
    ...PIEZAS_CIRCUITO
});

// Devuelve el dibujo de una pieza; la cota cambia según lo larga que sea
function dibujoDe(pieza) {
    const definicion = PIEZAS[pieza.tipo];
    const svg = typeof definicion.svg === 'function' ? definicion.svg(pieza) : definicion.svg;
    const zona = typeof definicion.zona === 'function' ? definicion.zona(pieza) : definicion.zona;
    return { svg, zona };
}

// Lo que se puede editar en cada pieza. Por dentro siempre se guarda igual: los bloques, barras, carritos y pelotas
// en kg (masa), las fuerzas en N, la rampa en grados, el engranaje en dientes, el lanzador en m/s y los
// componentes de circuito en V (batería), Ω (resistencia y foco) y μF (capacitor)
const VALORES = Object.freeze({
    bloque: { magnitud: 'masa', inicial: 2, min: 0.01, max: 1000 },
    barra: { magnitud: 'masa', inicial: 1, min: 0.01, max: 1000 },
    fuerza: { magnitud: 'fuerza', inicial: 20, min: 0.1, max: 10000 },
    piso: { magnitud: 'rozamiento', inicial: 0.5, min: 0, max: 2 },
    rampa: { magnitud: 'rozamiento', inicial: 0.6, min: 0, max: 2 },
    recipiente: { magnitud: 'densidad', inicial: 1, min: 0.1, max: 20 },
    disco: { magnitud: 'radio', inicial: 50, min: 10, max: 200 },
    velocidad: { magnitud: 'rapidez', inicial: 5, min: 0.1, max: 30 },
    carga: { magnitud: 'carga', inicial: 2, min: -100, max: 100 },
    campo: { magnitud: 'campoMagnetico', inicial: 1, min: -10, max: 10 },
    proton: { magnitud: 'rapidez', inicial: 5, min: 0.1, max: 30 },
    electron: { magnitud: 'rapidez', inicial: 5, min: 0.1, max: 30 },
    engranaje: { magnitud: 'dientes', inicial: 20, min: 6, max: 60, entero: true },
    carrito: { magnitud: 'masa', inicial: 2, min: 0.01, max: 1000 },
    pelota: { magnitud: 'masa', inicial: 0.5, min: 0.01, max: 100 },
    lanzador: { magnitud: 'rapidez', inicial: 20, min: 1, max: 60 },
    bateria: { magnitud: 'voltaje', inicial: 12, min: 0.1, max: 1000 },
    resistencia: { magnitud: 'resistencia', inicial: 4, min: 0.01, max: 1000000 },
    foco: { magnitud: 'resistencia', inicial: 6, min: 0.01, max: 1000000 },
    capacitor: { magnitud: 'capacidad', inicial: 5, min: 0.001, max: 1000000 }
});

// El ángulo, los dientes, la rapidez y lo eléctrico se ven igual con cualquier unidad elegida.
// "prefijo" y "sufijo" van pegados al número sobre la pieza ("μ = 0,5", "30°"; en el engranaje solo el número)
const SIN_CONVERSION = Object.freeze({
    angulo: { factor: 1, simbolo: '°', etiqueta: 'Ángulo', sufijo: '°' },
    dientes: { factor: 1, simbolo: 'dientes', etiqueta: 'Dientes', sufijo: '' },
    rapidez: { factor: 1, simbolo: 'm/s', etiqueta: 'Rapidez' },
    voltaje: { factor: 1, simbolo: 'V', etiqueta: 'Voltaje' },
    resistencia: { factor: 1, simbolo: 'Ω', etiqueta: 'Resistencia' },
    capacidad: { factor: 1, simbolo: 'μF', etiqueta: 'Capacidad' },
    rozamiento: { factor: 1, simbolo: '', etiqueta: 'Rozamiento μ', prefijo: 'μ = ', sufijo: '' },
    densidad: { factor: 1, simbolo: 'g/cm³', etiqueta: 'Densidad', prefijo: 'ρ = ' },
    radio: { factor: 1, simbolo: 'cm', etiqueta: 'Radio', prefijo: 'R = ' },
    carga: { factor: 1, simbolo: 'μC', etiqueta: 'Carga' },
    campoMagnetico: { factor: 1, simbolo: 'T', etiqueta: 'Campo B', prefijo: 'B = ' }
});

// Para ver los pesos en N, kg o kgf: lo que se ve = lo guardado × factor
const UNIDADES = Object.freeze({
    N: {
        masa: { factor: G, simbolo: 'N', etiqueta: 'Peso' },
        fuerza: { factor: 1, simbolo: 'N', etiqueta: 'Fuerza' },
        ...SIN_CONVERSION
    },
    kg: {
        masa: { factor: 1, simbolo: 'kg', etiqueta: 'Masa' },
        fuerza: { factor: 1, simbolo: 'N', etiqueta: 'Fuerza' },
        ...SIN_CONVERSION
    },
    kgf: {
        masa: { factor: 1, simbolo: 'kgf', etiqueta: 'Peso' },
        fuerza: { factor: 1 / G, simbolo: 'kgf', etiqueta: 'Fuerza' },
        ...SIN_CONVERSION
    }
});

// Catálogo de piezas del laboratorio de equilibrio y palancas.
// Cada pieza se dibuja con su origen en (0, 0): las físicas centradas, la cota desde su extremo izquierdo.
// Las medidas son múltiplos de 20 (el tamaño de la cuadrícula) para que las piezas encajen entre sí.
// zona: [x, y, ancho, alto] del área para agarrar la pieza y del recuadro de selección.
// Los textos (.valor y .texto) los rellena editor-lienzo.js con textContent.

const COLOR_LINEA = '#1f2937';
const COLOR_COTA = '#374151';
const G = 10; // m/s², como en los exámenes

// Rayitas de un soporte fijo, entre x = desde y x = hasta, que salen de y hacia arriba (-1) o hacia abajo (1)
function rayas(desde, hasta, y, sentido) {
    const lineas = [];
    for (let x = desde; x < hasta; x += 12) {
        lineas.push(`<line x1="${x}" y1="${y}" x2="${x + 10}" y2="${y + 12 * sentido}" stroke="${COLOR_LINEA}" stroke-width="1.5"/>`);
    }
    return lineas.join('');
}

// Marcas cada 20 unidades sobre la barra, para medir distancias
function marcasDeBarra(mitad) {
    const marcas = [];
    for (let x = -mitad + 20; x < mitad; x += 20) {
        marcas.push(`<line x1="${x}" y1="-6" x2="${x}" y2="${x === 0 ? 2 : -1}" stroke="#7c4a1e" stroke-width="1"/>`);
    }
    return marcas.join('');
}

// Línea de medida de `largo` unidades, con topes y flechas en los extremos y el texto encima
function dibujarCota({ largo }) {
    const flecha = (x, sentido) => `<polygon points="${x},0 ${x + 7 * sentido},-3.5 ${x + 7 * sentido},3.5" fill="${COLOR_COTA}"/>`;
    return `<line x1="0" y1="-7" x2="0" y2="7" stroke="${COLOR_COTA}" stroke-width="1.5"/>
            <line x1="${largo}" y1="-7" x2="${largo}" y2="7" stroke="${COLOR_COTA}" stroke-width="1.5"/>
            <line x1="0" y1="0" x2="${largo}" y2="0" stroke="${COLOR_COTA}" stroke-width="1.5"/>
            ${flecha(0, 1)}${flecha(largo, -1)}
            <text class="texto" x="${largo / 2}" y="-6" text-anchor="middle" font-size="13" fill="${COLOR_COTA}">d</text>`;
}

const PIEZAS = Object.freeze({
    techo: {
        nombre: 'Techo',
        zona: [-100, -14, 200, 26],
        svg: `<rect x="-100" y="0" width="200" height="8" fill="#6b7280"/>${rayas(-100, 100, 0, -1)}`
    },
    piso: {
        nombre: 'Piso',
        zona: [-100, -10, 200, 26],
        svg: `<rect x="-100" y="-8" width="200" height="8" fill="#6b7280"/>${rayas(-100, 100, 0, 1)}`
    },
    barra: {
        nombre: 'Barra',
        zona: [-120, -10, 240, 20],
        svg: `<rect x="-120" y="-6" width="240" height="12" rx="2" fill="#d6a96b" stroke="#7c4a1e" stroke-width="1.5"/>${marcasDeBarra(120)}`
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
    bloque: {
        nombre: 'Bloque',
        zona: [-22, -22, 44, 44],
        svg: `<rect x="-20" y="-20" width="40" height="40" fill="#93c5fd" stroke="${COLOR_LINEA}" stroke-width="1.5"/>
              <text class="valor" x="0" y="4" text-anchor="middle" font-size="12" fill="${COLOR_LINEA}">m</text>`
    },
    polea: {
        nombre: 'Polea',
        zona: [-24, -48, 48, 72],
        svg: `<rect x="-8" y="-46" width="16" height="6" fill="#6b7280"/>
              <line x1="0" y1="-40" x2="0" y2="0" stroke="${COLOR_LINEA}" stroke-width="3"/>
              <circle r="20" fill="#e5e7eb" stroke="${COLOR_LINEA}" stroke-width="2"/>
              <circle r="4" fill="${COLOR_LINEA}"/>`
    },
    fuerza: {
        nombre: 'Fuerza',
        zona: [-12, -32, 30, 64],
        svg: `<line x1="0" y1="30" x2="0" y2="-20" stroke="#dc2626" stroke-width="3"/>
              <polygon points="0,-30 -7,-17 7,-17" fill="#dc2626"/>
              <text class="valor" x="10" y="-14" font-size="13" font-weight="700" fill="#dc2626">F</text>`
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
    }
});

// Marcado SVG y zona de una pieza concreta (la cota depende de su largo)
function dibujoDe(pieza) {
    const definicion = PIEZAS[pieza.tipo];
    const svg = typeof definicion.svg === 'function' ? definicion.svg(pieza) : definicion.svg;
    const zona = typeof definicion.zona === 'function' ? definicion.zona(pieza) : definicion.zona;
    return { svg, zona };
}

// Valor editable de cada pieza, siempre guardado en unidades internas:
// masa en kg (bloques y barras) y fuerza en N (flechas de fuerza)
const VALORES = Object.freeze({
    bloque: { magnitud: 'masa', inicial: 2, min: 0.01, max: 1000 },
    barra: { magnitud: 'masa', inicial: 1, min: 0.01, max: 1000 },
    fuerza: { magnitud: 'fuerza', inicial: 20, min: 0.1, max: 10000 }
});

// Cómo se muestra cada magnitud según la unidad elegida: mostrado = interno × factor
const UNIDADES = Object.freeze({
    N: {
        masa: { factor: G, simbolo: 'N', etiqueta: 'Peso' },
        fuerza: { factor: 1, simbolo: 'N', etiqueta: 'Fuerza' }
    },
    kg: {
        masa: { factor: 1, simbolo: 'kg', etiqueta: 'Masa' },
        fuerza: { factor: 1, simbolo: 'N', etiqueta: 'Fuerza' }
    },
    kgf: {
        masa: { factor: 1, simbolo: 'kgf', etiqueta: 'Peso' },
        fuerza: { factor: 1 / G, simbolo: 'kgf', etiqueta: 'Fuerza' }
    }
});

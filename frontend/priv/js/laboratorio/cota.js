// La cota: una línea de medida con flechas en las puntas y la distancia escrita encima.
// La usan los dos laboratorios (física y geometría) y la solución paso a paso.
// Se dibuja desde (0, 0) hacia la derecha; quien la usa la mueve y la gira con transform.
// El texto ("d") lo cambia quien la usa, con textContent.

const COLOR_COTA = '#374151';

function dibujarCota({ largo }) {
    const flecha = (x, sentido) => `<polygon points="${x},0 ${x + 7 * sentido},-3.5 ${x + 7 * sentido},3.5" fill="${COLOR_COTA}"/>`;
    return `<line x1="0" y1="-7" x2="0" y2="7" stroke="${COLOR_COTA}" stroke-width="1.5"/>
            <line x1="${largo}" y1="-7" x2="${largo}" y2="7" stroke="${COLOR_COTA}" stroke-width="1.5"/>
            <line x1="0" y1="0" x2="${largo}" y2="0" stroke="${COLOR_COTA}" stroke-width="1.5"/>
            ${flecha(0, 1)}${flecha(largo, -1)}
            <text class="texto" x="${largo / 2}" y="-6" text-anchor="middle" font-size="13" fill="${COLOR_COTA}">d</text>`;
}

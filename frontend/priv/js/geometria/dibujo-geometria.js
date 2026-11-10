// Dibuja en SVG cada objeto que calculó el motor de geometría (motor-geometria.js).
// Los colores y grosores están en geometria.css (clases geo-...). La cota usa dibujarCota de cota.js.
// Los textos (etiquetas y medidas) se ponen con textContent, nunca como HTML.

const ORDEN_DE_CAPAS = Object.freeze(['ejes', 'region', 'solido', 'circulo', 'elipse', 'angulo', 'arco', 'curva', 'linea', 'cota', 'punto', 'texto']);
const RADIO_PUNTO = 4;
const RADIO_AGARRE = 12;        // área alrededor del punto para agarrarlo con el mouse
const RADIO_ARCO = 32;          // radio del arco de un ángulo si la figura no dice otro
const LADO_RECTO = 14;          // lado del cuadradito que marca un ángulo recto
const SEPARACION_ETIQUETA = 16; // del punto a su letra
const SEPARACION_TEXTO = 14;    // del arco o de la línea a su texto
const SEPARACION_COTA = 22;     // de la línea medida a su cota
const LARGO_RECTA = 4000;       // las rectas se dibujan muy largas y el lienzo las recorta
const LARGO_MARCA = 10;         // rayitas que marcan lados iguales
const SEPARACION_MARCAS = 4;
const MARCA_EJE = 4;            // rayitas de los números en los ejes
const MINIMO_ENTRE_NUMEROS = 18; // px: los números de los ejes no se amontonan
const RADIO_VERTICE = 3;        // puntitos de una gráfica
const LADOS = Object.freeze({ arriba: vector(0, -1), abajo: vector(0, 1), izquierda: vector(-1, 0), derecha: vector(1, 0) });

function nodoSvg(etiqueta, atributos = {}, texto) {
    const nodo = document.createElementNS(SVG_NS, etiqueta);
    Object.entries(atributos).forEach(([nombre, valor]) => nodo.setAttribute(nombre, valor));
    if (texto !== undefined) nodo.textContent = String(texto);
    return nodo;
}

const radioDeAngulo = (objeto) => (esNumero(objeto.radio) && objeto.radio > 0 ? objeto.radio : RADIO_ARCO);

// "lado" puede ser arriba, abajo, izquierda, derecha o una mezcla como "arriba-izquierda"
const deLado = (lado) =>
    typeof lado === 'string' ? unitario(lado.split('-').map((l) => LADOS[l] || vector(0, 0)).reduce(sumar, vector(0, 0))) : null;

// Lo que se escribe junto a un objeto: su medida (si se está midiendo) o lo que diga su "texto"
function textoDe(calculado, { medir, escala, unidad }) {
    const { objeto } = calculado;
    if (medir && objeto.medir) {
        const medida = textoDeMedida(calculado, { escala, unidad });
        if (medida) return { texto: medida, clase: 'texto medida' };
    }
    return typeof objeto.texto === 'string' && objeto.texto ? { texto: objeto.texto, clase: 'texto' } : null;
}

function escribir(grupo, posicion, contenido) {
    if (contenido) grupo.append(nodoSvg('text', { x: posicion.x, y: posicion.y, class: contenido.clase }, contenido.texto));
}

/* ---------- Caminos (los usan el dibujo normal y el resaltado) ---------- */

function extremosDeLinea({ p, q, alcance }) {
    if (alcance !== 'recta') return [p, q];
    const d = unitario(restar(q, p));
    return [sumar(p, escalar(d, -LARGO_RECTA)), sumar(p, escalar(d, LARGO_RECTA))];
}

// Arco de un ángulo; cerrado = con las dos líneas hasta el vértice (para pintarlo por dentro)
function caminoDeArco(centro, radio, inicio, barrido, cerrado) {
    const a = enDireccion(centro, inicio, radio);
    const b = enDireccion(centro, inicio + barrido, radio);
    const grande = Math.abs(barrido) > 180 ? 1 : 0;
    const sentido = barrido > 0 ? 0 : 1; // en el lienzo y crece hacia abajo: "en contra del reloj" es 0
    const arco = `A ${radio} ${radio} 0 ${grande} ${sentido} ${b.x} ${b.y}`;
    return cerrado ? `M ${centro.x} ${centro.y} L ${a.x} ${a.y} ${arco} Z` : `M ${a.x} ${a.y} ${arco}`;
}

function caminoDeRecto({ vertice, inicio, barrido }) {
    const a = enDireccion(vertice, inicio, LADO_RECTO);
    const b = enDireccion(vertice, inicio + barrido, LADO_RECTO);
    const esquina = sumar(a, restar(b, vertice));
    return `M ${a.x} ${a.y} L ${esquina.x} ${esquina.y} L ${b.x} ${b.y}`;
}

// Sector de corona: el arco de afuera, una línea, el arco de adentro al revés y se cierra
function caminoDeCorona({ centro, radio, radioInterno, inicio, barrido }) {
    const a = enDireccion(centro, inicio, radio);
    const b = enDireccion(centro, inicio + barrido, radio);
    const c = enDireccion(centro, inicio + barrido, radioInterno);
    const d = enDireccion(centro, inicio, radioInterno);
    const grande = Math.abs(barrido) > 180 ? 1 : 0;
    const sentido = barrido > 0 ? 0 : 1;
    return `M ${a.x} ${a.y} A ${radio} ${radio} 0 ${grande} ${sentido} ${b.x} ${b.y} L ${c.x} ${c.y} ` +
        `A ${radioInterno} ${radioInterno} 0 ${grande} ${1 - sentido} ${d.x} ${d.y} Z`;
}

function caminoDeRegion(geo) {
    if (!esNumero(geo.radio)) return `M ${geo.puntos.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;
    return geo.radioInterno > 0 ? caminoDeCorona(geo) : caminoDeArco(geo.centro, geo.radio, geo.inicio, geo.barrido, true);
}

const caminoDePuntos = (puntos) => `M ${puntos.map((p) => `${p.x} ${p.y}`).join(' L ')}`;

// Curva suave que pasa por todos los puntos (Catmull-Rom convertida a curvas de Bézier)
function caminoSuave(puntos) {
    const partes = [`M ${puntos[0].x} ${puntos[0].y}`];
    for (let i = 0; i < puntos.length - 1; i += 1) {
        const [p0, p1, p2, p3] = [puntos[i - 1] || puntos[i], puntos[i], puntos[i + 1], puntos[i + 2] || puntos[i + 1]];
        const c1 = sumar(p1, escalar(restar(p2, p0), 1 / 6));
        const c2 = restar(p2, escalar(restar(p3, p1), 1 / 6));
        partes.push(`C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`);
    }
    return partes.join(' ');
}

// Media elipse de izquierda a derecha: por arriba (la parte de atrás de una base) o por abajo (la de adelante)
const mediaElipse = (c, rx, ry, porArriba) => `M ${c.x - rx} ${c.y} A ${rx} ${ry} 0 0 ${porArriba ? 1 : 0} ${c.x + rx} ${c.y}`;
const elipseEntera = (c, rx, ry) => `${mediaElipse(c, rx, ry, true)} A ${rx} ${ry} 0 0 1 ${c.x - rx} ${c.y}`;

function caminoDeElipse({ centro, rx, ry, parte }) {
    if (parte === 'superior') return mediaElipse(centro, rx, ry, true);
    if (parte === 'inferior') return mediaElipse(centro, rx, ry, false);
    return elipseEntera(centro, rx, ry);
}

/* ---------- Cada clase de objeto ---------- */

function dibujarPunto(grupo, { objeto, geo }, { centro }) {
    grupo.append(
        nodoSvg('circle', { cx: geo.x, cy: geo.y, r: RADIO_AGARRE, class: 'agarre' }),
        nodoSvg('circle', { cx: geo.x, cy: geo.y, r: RADIO_PUNTO, class: 'marca' })
    );
    const etiqueta = typeof objeto.etiqueta === 'string' ? objeto.etiqueta : objeto.id;
    if (!etiqueta) return;
    // La letra va del lado pedido o, si no, hacia afuera de la figura
    const hacia = deLado(objeto.lado) || unitario(restar(geo, centro)) || vector(-0.7, -0.7);
    escribir(grupo, sumar(geo, escalar(hacia, SEPARACION_ETIQUETA)), { texto: etiqueta, clase: 'etiqueta' });
}

// Rayitas en el medio de un segmento para marcar que mide lo mismo que otro ( | , || , ||| )
function marcasDeIgualdad({ p, q }, cantidad) {
    const d = unitario(restar(q, p));
    const n = girar90(d);
    const medio = escalar(sumar(p, q), 0.5);
    return Array.from({ length: cantidad }, (_, i) => {
        const centro = sumar(medio, escalar(d, (i - (cantidad - 1) / 2) * SEPARACION_MARCAS));
        const a = sumar(centro, escalar(n, LARGO_MARCA / 2));
        const b = sumar(centro, escalar(n, -LARGO_MARCA / 2));
        return nodoSvg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'marca-igual' });
    });
}

function dibujarLinea(grupo, calculado, opciones) {
    const { objeto, geo } = calculado;
    const [a, b] = extremosDeLinea(geo);
    const atributos = { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'trazo' };
    grupo.append(nodoSvg('line', geo.alcance === 'rayo' ? { ...atributos, 'marker-end': 'url(#puntaRayo)' } : atributos));
    const marcas = Math.min(3, Math.max(0, Math.round(Number(objeto.marcas) || 0)));
    if (marcas > 0) grupo.append(...marcasDeIgualdad(geo, marcas));
    // El texto va a su costado, del lado de afuera de la figura (en un vector, si se pide, junto a la punta)
    const medio = escalar(sumar(geo.p, geo.q), 0.5);
    const normal = unitario(girar90(restar(geo.q, geo.p)));
    const afuera = productoPunto(normal, restar(medio, opciones.centro)) < 0 ? escalar(normal, -1) : normal;
    const base = objeto.textoEn === 'punta' ? geo.q : medio;
    escribir(grupo, sumar(base, escalar(afuera, SEPARACION_TEXTO)), textoDe(calculado, opciones));
}

function dibujarCirculo(grupo, { geo }) {
    grupo.append(nodoSvg('circle', { cx: geo.centro.x, cy: geo.centro.y, r: geo.radio, class: 'trazo' }));
}

function dibujarAngulo(grupo, calculado, opciones) {
    const { objeto, geo } = calculado;
    const radio = radioDeAngulo(objeto);
    if (objeto.recto) {
        grupo.append(nodoSvg('path', { d: caminoDeRecto(geo), class: 'recto' }));
    } else {
        grupo.append(
            nodoSvg('path', { d: caminoDeArco(geo.vertice, radio, geo.inicio, geo.barrido, true), class: 'relleno' }),
            nodoSvg('path', { d: caminoDeArco(geo.vertice, radio, geo.inicio, geo.barrido, false), class: 'arco' })
        );
    }
    const distancia = (objeto.recto ? LADO_RECTO * 2 : radio) + SEPARACION_TEXTO;
    escribir(grupo, enDireccion(geo.vertice, geo.inicio + geo.barrido / 2, distancia), textoDe(calculado, opciones));
}

function dibujarRegion(grupo, calculado, opciones) {
    const { geo } = calculado;
    const clase = calculado.objeto.relleno === 'rayado' ? 'relleno rayado' : 'relleno';
    grupo.append(nodoSvg('path', { d: caminoDeRegion(geo), class: clase }));
    const centroRegion = esNumero(geo.radio)
        ? enDireccion(geo.centro, geo.inicio + geo.barrido / 2, geo.radioInterno > 0 ? (geo.radio + geo.radioInterno) / 2 : geo.radio * 0.6)
        : escalar(geo.puntos.reduce(sumar, vector(0, 0)), 1 / geo.puntos.length);
    escribir(grupo, centroRegion, textoDe(calculado, opciones));
}

function dibujarCotaGeometria(grupo, calculado, opciones) {
    const { objeto, geo } = calculado;
    // Se dibuja de izquierda a derecha para que el texto nunca quede de cabeza
    const [inicio, fin] = geo.q.x >= geo.p.x ? [geo.p, geo.q] : [geo.q, geo.p];
    const separacion = esNumero(objeto.separacion) ? objeto.separacion : SEPARACION_COTA;
    const cota = nodoSvg('g', {
        transform: `translate(${inicio.x} ${inicio.y}) rotate(${-direccion(inicio, fin)}) translate(0 ${-separacion})`
    });
    cota.innerHTML = dibujarCota({ largo: distanciaEntre(inicio, fin) }); // dibujo fijo, sin datos de la figura
    // Si la cota no tiene texto, muestra su medida
    const contenido = textoDe(calculado, opciones);
    cota.querySelector('.texto').textContent = contenido ? contenido.texto : textoDeMedida(calculado, opciones) ?? '';
    grupo.append(cota);
}

function dibujarTexto(grupo, calculado, opciones) {
    escribir(grupo, calculado.geo, textoDe(calculado, opciones));
}

// Cada cuántas unidades se escribe un número en los ejes, para que no se amontonen
const pasoDeNumeros = (escala) => [1, 2, 5, 10, 20, 50, 100, 200, 500].find((p) => p * escala >= MINIMO_ENTRE_NUMEROS) || 1000;

function dibujarEjes(grupo, { geo }) {
    const { xMin, xMax, yMin, yMax, nombres } = geo;
    const en = (x, y) => enEjes(geo, [x, y]);
    const linea = (a, b) => nodoSvg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'eje', 'marker-end': 'url(#puntaRayo)' });
    grupo.append(linea(en(xMin, 0), en(xMax, 0)), linea(en(0, yMin), en(0, yMax)));
    const paso = pasoDeNumeros(geo.escala);
    for (let k = Math.ceil(xMin / paso); k * paso < xMax; k += 1) {
        if (k === 0) continue;
        const p = en(k * paso, 0);
        grupo.append(nodoSvg('line', { x1: p.x, y1: p.y - MARCA_EJE, x2: p.x, y2: p.y + MARCA_EJE, class: 'eje' }));
        escribir(grupo, vector(p.x, p.y + 14), { texto: formatearNumero(k * paso, 2), clase: 'numero' });
    }
    for (let k = Math.ceil(yMin / paso); k * paso < yMax; k += 1) {
        if (k === 0) continue;
        const p = en(0, k * paso);
        grupo.append(nodoSvg('line', { x1: p.x - MARCA_EJE, y1: p.y, x2: p.x + MARCA_EJE, y2: p.y, class: 'eje' }));
        escribir(grupo, vector(p.x - 14, p.y), { texto: formatearNumero(k * paso, 2), clase: 'numero' });
    }
    const origen = en(0, 0);
    escribir(grupo, vector(origen.x - 9, origen.y + 12), { texto: '0', clase: 'numero' });
    const finX = en(xMax, 0);
    const finY = en(0, yMax);
    escribir(grupo, vector(finX.x + 6, finX.y + 14), { texto: nombres[0], clase: 'etiqueta' });
    escribir(grupo, vector(finY.x + 14, finY.y + 2), { texto: nombres[1], clase: 'etiqueta' });
}

// Gráfica: la línea (o curva suave), sus puntitos y, si se pide, las líneas guía hasta los ejes
function dibujarGrafica(grupo, calculado, opciones) {
    const { objeto, geo } = calculado;
    if (objeto.guias) {
        geo.puntos.forEach((p) => {
            grupo.append(
                nodoSvg('line', { x1: p.x, y1: p.y, x2: p.x, y2: geo.ejes.origen.y, class: 'guia' }),
                nodoSvg('line', { x1: p.x, y1: p.y, x2: geo.ejes.origen.x, y2: p.y, class: 'guia' })
            );
        });
    }
    grupo.append(nodoSvg('path', { d: objeto.suave ? caminoSuave(geo.puntos) : caminoDePuntos(geo.puntos), class: 'trazo curva' }));
    if (objeto.vertices !== false) geo.puntos.forEach((p) => grupo.append(nodoSvg('circle', { cx: p.x, cy: p.y, r: RADIO_VERTICE, class: 'vertice' })));
    const ultimo = geo.puntos[geo.puntos.length - 1];
    escribir(grupo, vector(ultimo.x + 10, ultimo.y - 10), textoDe(calculado, opciones));
}

function dibujarElipse(grupo, { geo }) {
    grupo.append(nodoSvg('path', { d: caminoDeElipse(geo), class: 'trazo' }));
}

function dibujarArco(grupo, calculado, opciones) {
    const { geo } = calculado;
    grupo.append(nodoSvg('path', { d: caminoDeArco(geo.centro, geo.radio, geo.inicio, geo.barrido, false), class: 'trazo arco-geo' }));
    escribir(grupo, enDireccion(geo.centro, geo.inicio + geo.barrido / 2, geo.radio + SEPARACION_TEXTO), textoDe(calculado, opciones));
}

// Cada sólido es una lista de trazos: los de adelante enteros y los de atrás punteados ("oculto")
const DIBUJOS_DE_SOLIDO = Object.freeze({
    cilindro: ({ centro, radio, alto }) => {
        const ry = radio * ACHATAMIENTO;
        const tapa = vector(centro.x, centro.y - alto);
        return [
            { d: `M ${centro.x - radio} ${centro.y} L ${tapa.x - radio} ${tapa.y} M ${centro.x + radio} ${centro.y} L ${tapa.x + radio} ${tapa.y}`, clase: 'trazo' },
            { d: mediaElipse(centro, radio, ry, false), clase: 'trazo' },
            { d: mediaElipse(centro, radio, ry, true), clase: 'trazo oculto' },
            { d: elipseEntera(tapa, radio, ry), clase: 'trazo' }
        ];
    },
    cono: ({ centro, radio, alto }) => {
        const ry = radio * ACHATAMIENTO;
        return [
            { d: `M ${centro.x - radio} ${centro.y} L ${centro.x} ${centro.y - alto} L ${centro.x + radio} ${centro.y}`, clase: 'trazo' },
            { d: mediaElipse(centro, radio, ry, false), clase: 'trazo' },
            { d: mediaElipse(centro, radio, ry, true), clase: 'trazo oculto' }
        ];
    },
    esfera: ({ centro, radio }) => [
        { d: elipseEntera(centro, radio, radio), clase: 'trazo' },
        { d: mediaElipse(centro, radio, radio * ACHATAMIENTO, false), clase: 'trazo' },
        { d: mediaElipse(centro, radio, radio * ACHATAMIENTO, true), clase: 'trazo oculto' }
    ],
    tronco: (geo) => {
        const { abajo, arriba } = esquinasDeTronco(geo);
        const linea = (a, b) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
        const visibles = [
            linea(abajo[0], abajo[1]), linea(abajo[1], abajo[2]),
            ...arriba.map((p, i) => linea(p, arriba[(i + 1) % 4])),
            linea(abajo[0], arriba[0]), linea(abajo[1], arriba[1]), linea(abajo[2], arriba[2])
        ];
        // La esquina de atrás a la izquierda de la base no se ve: sus tres aristas van punteadas
        const ocultas = [linea(abajo[2], abajo[3]), linea(abajo[3], abajo[0]), linea(abajo[3], arriba[3])];
        return [{ d: visibles.join(' '), clase: 'trazo' }, { d: ocultas.join(' '), clase: 'trazo oculto' }];
    }
});

function dibujarSolido(grupo, { geo }) {
    DIBUJOS_DE_SOLIDO[geo.forma](geo).forEach(({ d, clase }) => grupo.append(nodoSvg('path', { d, class: clase })));
}

const DIBUJANTES = Object.freeze({
    punto: dibujarPunto,
    linea: dibujarLinea,
    circulo: dibujarCirculo,
    angulo: dibujarAngulo,
    region: dibujarRegion,
    cota: dibujarCotaGeometria,
    texto: dibujarTexto,
    ejes: dibujarEjes,
    curva: dibujarGrafica,
    elipse: dibujarElipse,
    arco: dibujarArco,
    solido: dibujarSolido
});

const ordenDeCapa = ({ clase }) => ORDEN_DE_CAPAS.indexOf(clase);

// opciones: { centro (de la figura, para poner las letras hacia afuera), medir, escala, unidad }
function dibujarObjeto(calculado, opciones) {
    const { objeto, clase } = calculado;
    const clases = ['geo', `geo-${clase}`];
    if (objeto.tipo === 'punto') clases.push('libre'); // los puntos libres se pueden arrastrar
    if (objeto.estilo === 'punteado') clases.push('punteado');
    const grupo = nodoSvg('g', { class: clases.join(' '), 'data-id': objeto.id });
    DIBUJANTES[clase](grupo, calculado, opciones);
    return grupo;
}

/* ---------- Resaltado (lo usa la solución paso a paso para marcar un objeto en rojo) ---------- */

const RESALTADOS = Object.freeze({
    punto: ({ geo }) => nodoSvg('circle', { cx: geo.x, cy: geo.y, r: RADIO_AGARRE }),
    texto: ({ geo }) => nodoSvg('circle', { cx: geo.x, cy: geo.y, r: RADIO_AGARRE * 2 }),
    linea: ({ geo }) => {
        const [a, b] = extremosDeLinea(geo);
        return nodoSvg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    },
    cota: ({ geo }) => nodoSvg('line', { x1: geo.p.x, y1: geo.p.y, x2: geo.q.x, y2: geo.q.y }),
    circulo: ({ geo }) => nodoSvg('circle', { cx: geo.centro.x, cy: geo.centro.y, r: geo.radio }),
    angulo: ({ objeto, geo }) =>
        nodoSvg('path', {
            d: objeto.recto ? caminoDeRecto(geo) : caminoDeArco(geo.vertice, radioDeAngulo(objeto), geo.inicio, geo.barrido, true)
        }),
    region: ({ geo }) => nodoSvg('path', { d: caminoDeRegion(geo) }),
    ejes: ({ geo }) => {
        const [a, b] = [enEjes(geo, [geo.xMin, 0]), enEjes(geo, [geo.xMax, 0])];
        const [c, d] = [enEjes(geo, [0, geo.yMin]), enEjes(geo, [0, geo.yMax])];
        return nodoSvg('path', { d: `M ${a.x} ${a.y} L ${b.x} ${b.y} M ${c.x} ${c.y} L ${d.x} ${d.y}` });
    },
    curva: ({ geo }) => nodoSvg('path', { d: caminoDePuntos(geo.puntos) }),
    elipse: ({ geo }) => nodoSvg('path', { d: caminoDeElipse(geo) }),
    arco: ({ geo }) => nodoSvg('path', { d: caminoDeArco(geo.centro, geo.radio, geo.inicio, geo.barrido, false) }),
    solido: ({ geo }) => {
        const bordes = bordesDeSolido(geo);
        const xs = bordes.map((p) => p.x);
        const ys = bordes.map((p) => p.y);
        const [x1, y1, x2, y2] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        return nodoSvg('path', { d: `M ${x1 - 6} ${y1 - 6} H ${x2 + 6} V ${y2 + 6} H ${x1 - 6} Z` });
    }
});

function dibujarResaltado(calculado) {
    const grupo = nodoSvg('g', { class: `resaltado-geo resaltado-${calculado.clase}` });
    grupo.append(RESALTADOS[calculado.clase](calculado));
    return grupo;
}

// Circuitos eléctricos del laboratorio: qué componentes quedan unidos y cuánta corriente pasa por cada uno.
// Cada componente tiene dos terminales (sus puntas). Dos terminales en el mismo lugar quedan unidas, y una terminal
// que cae sobre un cable también (el cable se parte ahí). Los lugares donde se unen terminales son los nodos.
// Se calcula con el análisis nodal: las leyes de Kirchhoff escritas como un sistema de ecuaciones.
//   · Resistencia, foco, amperímetro y cable dejan pasar corriente según la ley de Ohm (I = V / R);
//     el cable y el amperímetro casi no tienen resistencia.
//   · La batería fija la diferencia de voltaje entre sus terminales (el + es la terminal de +40 px).
//   · El capacitor y el voltímetro no dejan pasar corriente (circuito de corriente continua ya cargado).
//   · Los nodos que solo tocan capacitores (como el del medio de dos capacitores en serie) quedan aislados:
//     su voltaje sale de que su carga total es cero, Σ C·(V − V vecino) = 0. Así la carga en serie sale igual.
// Usa aMundo de motor-fisica.js y MEDIO_COMPONENTE de dibujo-circuitos.js.

const R_CABLE = 1e-6;          // Ω: un cable casi no tiene resistencia (como uno ideal)
const G_MINIMA = 1e-9;         // S: une cada nodo con tierra muy débilmente para que el sistema siempre tenga solución
const PIVOTE_MINIMO = 1e-12;   // si al resolver queda un número menor, el circuito es imposible

const COMPORTAMIENTO = Object.freeze({
    resistencia: { tipo: 'resistencia', ohmios: (p) => p.valor },
    foco: { tipo: 'resistencia', ohmios: (p) => p.valor },
    amperimetro: { tipo: 'resistencia', ohmios: () => R_CABLE },
    cable: { tipo: 'resistencia', ohmios: () => R_CABLE },
    bateria: { tipo: 'fuente' },
    capacitor: { tipo: 'abierto' },
    voltimetro: { tipo: 'abierto' }
});

const esDeCircuito = (pieza) => Boolean(COMPORTAMIENTO[pieza.tipo]) && (pieza.tipo !== 'cable' || pieza.largo > 0);
const claveDeTerminal = ({ x, y }) => `${x},${y}`;
const ohmiosDe = (pieza) => Math.max(COMPORTAMIENTO[pieza.tipo].ohmios(pieza), R_CABLE);

// Las dos terminales de un componente en el lienzo (redondeadas para que las que coinciden den igual)
function terminalesDe(pieza) {
    const [xa, xb] = pieza.tipo === 'cable' ? [0, pieza.largo] : [-MEDIO_COMPONENTE, MEDIO_COMPONENTE];
    return [aMundo(pieza, xa, 0), aMundo(pieza, xb, 0)].map(({ x, y }) => ({ x: Math.round(x), y: Math.round(y) }));
}

// ¿La terminal t cae sobre el cable a–b (sin contar sus puntas)?
function caeSobreCable(t, [a, b]) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const largo = Math.hypot(dx, dy);
    const avance = ((t.x - a.x) * dx + (t.y - a.y) * dy) / largo;
    const separacion = Math.abs((t.x - a.x) * dy - (t.y - a.y) * dx) / largo;
    return separacion < 1 && avance > 0.5 && avance < largo - 0.5;
}

// Cada componente es un elemento del circuito; un cable se parte en varios donde lo tocan otras terminales
function elementosDelCircuito(piezas) {
    const componentes = piezas.filter(esDeCircuito);
    const terminales = componentes.flatMap((pieza) => terminalesDe(pieza));
    return componentes.flatMap((pieza) => {
        const [a, b] = terminalesDe(pieza);
        if (pieza.tipo !== 'cable') return [{ pieza, desde: a, hasta: b }];
        const distanciaDesdeA = (t) => Math.hypot(t.x - a.x, t.y - a.y);
        const cortes = [...new Map(terminales.filter((t) => caeSobreCable(t, [a, b])).map((t) => [claveDeTerminal(t), t])).values()]
            .sort((t1, t2) => distanciaDesdeA(t1) - distanciaDesdeA(t2));
        const puntos = [a, ...cortes, b];
        return puntos.slice(1).map((hasta, i) => ({ pieza, desde: puntos[i], hasta }));
    });
}

// Para el editor: cada terminal y si quedó unida a otra (o sobre un cable)
function puntosDeCircuito(piezas) {
    const componentes = piezas.filter(esDeCircuito);
    const cuantas = new Map();
    componentes.forEach((pieza) => terminalesDe(pieza).forEach((t) => {
        cuantas.set(claveDeTerminal(t), (cuantas.get(claveDeTerminal(t)) || 0) + 1);
    }));
    const cables = componentes.filter((p) => p.tipo === 'cable').map((pieza) => ({ pieza, extremos: terminalesDe(pieza) }));
    return componentes.flatMap((pieza) => terminalesDe(pieza).map((t, i) => ({
        clave: `${pieza.id}:t${i}`,
        x: t.x,
        y: t.y,
        conectado: cuantas.get(claveDeTerminal(t)) > 1 || cables.some((c) => c.pieza !== pieza && caeSobreCable(t, c.extremos))
    })));
}

/* ---------- Análisis nodal ---------- */

// Arma el sistema de ecuaciones: una por nodo (lo que entra = lo que sale) y una por batería (su voltaje)
function armarEcuaciones(elementos, fuentes, indiceDe) {
    const nodos = indiceDe.size;
    const total = nodos + fuentes.length;
    const matriz = Array.from({ length: total }, () => new Array(total).fill(0));
    const derecha = new Array(total).fill(0);
    const agregar = (fila, columna, valor) => {
        if (fila !== undefined && columna !== undefined) matriz[fila][columna] += valor;
    };
    for (let i = 0; i < nodos; i += 1) matriz[i][i] += G_MINIMA;
    elementos.filter(({ pieza }) => COMPORTAMIENTO[pieza.tipo].tipo === 'resistencia').forEach(({ pieza, desde, hasta }) => {
        const g = 1 / ohmiosDe(pieza);
        const a = indiceDe.get(claveDeTerminal(desde));
        const b = indiceDe.get(claveDeTerminal(hasta));
        agregar(a, a, g);
        agregar(b, b, g);
        agregar(a, b, -g);
        agregar(b, a, -g);
    });
    fuentes.forEach(({ pieza, desde, hasta }, k) => {
        const fila = nodos + k;
        const mas = indiceDe.get(claveDeTerminal(hasta));
        const menos = indiceDe.get(claveDeTerminal(desde));
        agregar(mas, fila, 1);
        agregar(fila, mas, 1);
        agregar(menos, fila, -1);
        agregar(fila, menos, -1);
        derecha[fila] = pieza.valor;
    });
    return { matriz, derecha };
}

// Eliminación de Gauss-Jordan con pivoteo parcial. Devuelve null si el sistema no tiene solución única
function resolverSistema(matriz, derecha) {
    const n = derecha.length;
    const a = matriz.map((fila, i) => [...fila, derecha[i]]);
    for (let columna = 0; columna < n; columna += 1) {
        let mejor = columna;
        for (let fila = columna + 1; fila < n; fila += 1) {
            if (Math.abs(a[fila][columna]) > Math.abs(a[mejor][columna])) mejor = fila;
        }
        if (Math.abs(a[mejor][columna]) < PIVOTE_MINIMO) return null;
        [a[columna], a[mejor]] = [a[mejor], a[columna]];
        for (let fila = 0; fila < n; fila += 1) {
            if (fila === columna) continue;
            const factor = a[fila][columna] / a[columna][columna];
            for (let c = columna; c <= n; c += 1) a[fila][c] -= factor * a[columna][c];
        }
    }
    return a.map((fila, i) => fila[n] / fila[i]);
}

// Corriente (de "desde" a "hasta"), voltaje, potencia y, en el capacitor, su carga en μC (C en μF × V)
function medirElemento({ pieza, desde, hasta }, voltajeDe, corrienteDeFuente) {
    const voltaje = voltajeDe(desde) - voltajeDe(hasta);
    const base = { id: pieza.id, tipo: pieza.tipo, desde, hasta, voltaje, carga: null };
    const tipo = COMPORTAMIENTO[pieza.tipo].tipo;
    if (tipo === 'fuente') {
        const corriente = -corrienteDeFuente; // lo que la batería entrega por su polo +
        return { ...base, voltaje: pieza.valor, corriente, potencia: pieza.valor * corriente };
    }
    if (tipo === 'abierto') return { ...base, corriente: 0, potencia: 0, carga: pieza.tipo === 'capacitor' ? pieza.valor * voltaje : null };
    const corriente = voltaje / ohmiosDe(pieza);
    return { ...base, corriente, potencia: corriente * corriente * ohmiosDe(pieza) };
}

/* ---------- Nodos aislados entre capacitores ---------- */

// Agrupa los nodos que están unidos por algo que conduce (resistencias, cables, baterías). El grupo de la tierra
// ya tiene sus voltajes; los demás grupos ("islas") solo tocan capacitores y su voltaje se calcula aparte.
function gruposQueConducen(elementos) {
    const jefe = new Map();
    const buscar = (clave) => {
        if (!jefe.has(clave)) jefe.set(clave, clave);
        return jefe.get(clave) === clave ? clave : buscar(jefe.get(clave));
    };
    elementos.forEach(({ pieza, desde, hasta }) => {
        const a = buscar(claveDeTerminal(desde));
        const b = buscar(claveDeTerminal(hasta));
        if (COMPORTAMIENTO[pieza.tipo].tipo !== 'abierto' && a !== b) jefe.set(a, b);
    });
    return buscar;
}

// Voltaje de cada isla: en cada una, Σ C·(V isla − V del otro lado) = 0 (empezaron descargados)
function voltajesDeIslas(elementos, voltajeDe, tierra) {
    const grupoDe = gruposQueConducen(elementos);
    const grupoTierra = grupoDe(tierra);
    const capacitores = elementos.filter(({ pieza }) => pieza.tipo === 'capacitor' && pieza.valor > 0);
    const islas = [...new Set(capacitores.flatMap(({ desde, hasta }) => [grupoDe(claveDeTerminal(desde)), grupoDe(claveDeTerminal(hasta))]))]
        .filter((grupo) => grupo !== grupoTierra);
    if (islas.length === 0) return () => null;
    const indice = new Map(islas.map((isla, i) => [isla, i]));
    const matriz = islas.map(() => new Array(islas.length).fill(0));
    const derecha = new Array(islas.length).fill(0);
    capacitores.forEach(({ pieza, desde, hasta }) => {
        const lados = [desde, hasta].map((punto) => ({ punto, isla: indice.get(grupoDe(claveDeTerminal(punto))) }));
        lados.forEach((lado, i) => {
            const otro = lados[1 - i];
            if (lado.isla === undefined) return;
            matriz[lado.isla][lado.isla] += pieza.valor;
            if (otro.isla === undefined) derecha[lado.isla] += pieza.valor * voltajeDe(otro.punto);
            else matriz[lado.isla][otro.isla] -= pieza.valor;
        });
    });
    const solucion = resolverSistema(matriz, derecha);
    return (punto) => {
        const i = indice.get(grupoDe(claveDeTerminal(punto)));
        return solucion && i !== undefined ? solucion[i] : null;
    };
}

// Resuelve el circuito. Devuelve { elementos: [{ id, tipo, desde, hasta, corriente, voltaje, potencia, carga }], error }
function resolverCircuito(piezas) {
    const elementos = elementosDelCircuito(piezas);
    const fuentes = elementos.filter(({ pieza }) => COMPORTAMIENTO[pieza.tipo].tipo === 'fuente');
    if (fuentes.length === 0) return { elementos: [], error: 'Falta una batería' };
    const tierra = claveDeTerminal(fuentes[0].desde); // el polo − de la primera batería vale 0 V
    const nodos = [...new Set(elementos.flatMap((e) => [claveDeTerminal(e.desde), claveDeTerminal(e.hasta)]))].filter((c) => c !== tierra);
    const indiceDe = new Map(nodos.map((clave, i) => [clave, i]));
    const { matriz, derecha } = armarEcuaciones(elementos, fuentes, indiceDe);
    const solucion = resolverSistema(matriz, derecha);
    if (!solucion) return { elementos: [], error: 'Este circuito no se puede resolver (¿dos baterías unidas directamente?)' };
    const voltajeNodal = (punto) => {
        const i = indiceDe.get(claveDeTerminal(punto));
        return i === undefined ? 0 : solucion[i];
    };
    const voltajeDeIsla = voltajesDeIslas(elementos, voltajeNodal, tierra);
    const voltajeDe = (punto) => voltajeDeIsla(punto) ?? voltajeNodal(punto);
    return {
        elementos: elementos.map((e) => medirElemento(e, voltajeDe, solucion[nodos.length + fuentes.indexOf(e)])),
        error: null
    };
}

// Ayudas que comparten las pruebas: cargar en Node los scripts del navegador y leer las figuras guardadas en SQL.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..', '..');

// Los scripts del laboratorio usan variables globales (sin módulos), igual que en el navegador.
// Se cargan en orden en un contexto aparte y se devuelven las globales pedidas en `nombres`.
function cargarScripts(archivos, nombres, globalesExtra = {}) {
    const contexto = vm.createContext({ ...globalesExtra });
    archivos.forEach((archivo) => {
        vm.runInContext(fs.readFileSync(path.join(RAIZ, archivo), 'utf8'), contexto, { filename: archivo });
    });
    return vm.runInContext(`({ ${nombres.join(', ')} })`, contexto);
}

// Figuras y pasos de un archivo bd/*.sql:
//   UPDATE preguntas SET escena = '{...}'::jsonb, pasos = '[...]'::jsonb WHERE codigo_banco = N;
// En SQL un apóstrofo se escribe doble ('') y aquí se vuelve a uno solo.
function leerEscenas(archivoSql) {
    const sql = fs.readFileSync(path.join(RAIZ, archivoSql), 'utf8');
    const patron = /escena = '([\s\S]*?)'::jsonb,\s*pasos = '([\s\S]*?)'::jsonb\s*WHERE codigo_banco = (\d+)/g;
    const desdeSql = (texto) => JSON.parse(texto.replaceAll("''", "'"));
    return [...sql.matchAll(patron)].map(([, escena, pasos, codigo]) => ({
        codigo: Number(codigo),
        escena: desdeSql(escena),
        pasos: desdeSql(pasos)
    }));
}

// El laboratorio de física completo, con Matter.js, y una forma de avanzar la simulación cuadro a cuadro
function cargarFisica() {
    const Matter = require('matter-js');
    let siguienteCuadro = null;
    const archivos = ['cota.js', 'dibujo-circuitos.js', 'dibujo-piezas.js', 'engranajes.js', 'motor-fisica.js', 'mecanismos.js', 'circuitos.js', 'proyectiles.js', 'cargas.js'];
    const globales = cargarScripts(
        archivos.map((archivo) => `frontend/priv/js/laboratorio/${archivo}`),
        ['PIEZAS', 'VALORES', 'UNIDADES', 'G', 'dibujoDe', 'altoDeRampa', 'calcularGiros', 'VUELTAS_POR_SEGUNDO',
            'detectarConexiones', 'crearSimulacion', 'resolverCircuito', 'puntosDeCircuito', 'posicionDeProyectil',
            'lineasDeCampo', 'moverParticula'],
        {
            Matter,
            requestAnimationFrame: (funcion) => {
                siguienteCuadro = funcion;
                return 1;
            },
            cancelAnimationFrame: () => {}
        }
    );
    const avanzar = (cuadros) => {
        for (let i = 0; i < cuadros; i += 1) siguienteCuadro();
    };
    return { ...globales, avanzar };
}

module.exports = { RAIZ, cargarScripts, leerEscenas, cargarFisica };

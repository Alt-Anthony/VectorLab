// Pruebas de las figuras listas (plantillas) de la pestaña Geometría:
// cada una se arma sin errores y, aunque se agregue varias veces, nunca repite nombres.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cargarScripts } = require('./ayuda');

const geo = cargarScripts(
    ['frontend/priv/js/geometria/motor-geometria.js', 'frontend/priv/js/geometria/plantillas-geometria.js'],
    ['PLANTILLAS', 'crearPlantilla', 'resolverFigura']
);

test('cada plantilla se arma sin errores alrededor del punto donde se suelta', () => {
    Object.keys(geo.PLANTILLAS).forEach((clave) => {
        const { objetos, puntos } = geo.crearPlantilla(clave, { x: 300, y: 200 }, new Set());
        const { errores } = geo.resolverFigura(objetos);
        assert.equal(errores.length, 0, `${clave}: ${errores.join(' | ')}`);
        assert.equal(puntos.length, geo.PLANTILLAS[clave].puntos.length, `${clave}: puntos que se arrastran`);
        puntos.forEach((id) => {
            const punto = objetos.find((o) => o.id === id);
            assert.ok(Math.abs(punto.x - 300) <= 200 && Math.abs(punto.y - 200) <= 200, `${clave}: ${id} quedó lejos`);
        });
    });
});

test('agregar la misma plantilla varias veces no repite nombres y sigue con las letras libres', () => {
    const usados = new Set(['A']);
    const todos = [{ id: 'A', tipo: 'punto', x: 0, y: 0 }];
    ['triangulo', 'triangulo', 'circunferencia', 'perpendicular'].forEach((clave) => {
        const { objetos } = geo.crearPlantilla(clave, { x: 0, y: 0 }, usados);
        objetos.forEach((o) => {
            assert.ok(!usados.has(o.id), `${o.id} se repite`);
            usados.add(o.id);
        });
        todos.push(...objetos);
    });
    assert.deepEqual(todos.slice(1, 4).map((o) => o.id), ['B', 'C', 'D'], 'el primer triángulo usa B, C y D porque A ya existe');
    const { errores } = geo.resolverFigura(todos);
    assert.equal(errores.length, 0, errores.join(' | '));
});

test('una plantilla que no existe no arma nada', () => {
    assert.equal(geo.crearPlantilla('nave_espacial', { x: 0, y: 0 }, new Set()), null);
});

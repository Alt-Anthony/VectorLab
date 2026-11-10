-- Figuras del laboratorio de geometría y su resolución paso a paso, por pregunta.
-- escena: { "escala": px por unidad de largo, "unidadLargo": "m" | "cm" | "u", "objetos": [...] }
--   (una figura también puede llevar piezas de física: ver 04_escenas.sql; las dos se ven en el mismo laboratorio)
--   Cada objeto tiene un id y un tipo: punto, punto_medio, punto_en, punto_bisectriz, interseccion, proyeccion,
--   reflejo, tangente, segmento, rayo, recta, paralela, perpendicular, circunferencia, elipse, arco, angulo, sector,
--   poligono, cota, texto, ejes, punto_coord (punto por coordenadas), grafica, cilindro, cono, esfera o tronco.
--   Un objeto solo puede usar objetos que aparecen antes en la lista (ver frontend/priv/js/geometria/motor-geometria.js).
--   También puede llevar: etiqueta (lo que se escribe junto al punto), lado (dónde va la etiqueta), texto,
--   radio (del arco de un ángulo), recto (marca de ángulo recto), medir (el laboratorio lo mide),
--   oculto (aparece cuando un paso lo muestra), estilo ("punteado"), marcas (1 a 3 rayitas de lados iguales),
--   mayor (ángulo, arco o sector de más de 180°), relleno ("rayado"), textoEn ("punta") y, en las gráficas, guias y suave.
-- pasos: igual que en 04_escenas.sql, más "mostrar": [ids] para hacer aparecer objetos ocultos.
--   En el paso con "simular": true el laboratorio mide la figura y escribe las medidas de los objetos con "medir".
-- Si la pregunta no existe en la base, el UPDATE no hace nada.

-- Ángulos, pregunta 1: m∠BOC = 5·m∠AOB, OP es bisectriz de ∠AOC y m∠POC = 45°. Piden m∠BOP (respuesta: 30°).
-- La figura se arma con las medidas reales (∠AOB = 15°) para que el laboratorio pueda comprobar el resultado.
UPDATE preguntas SET
escena = '{
    "escala": 20,
    "unidadLargo": "u",
    "objetos": [
        { "id": "O", "tipo": "punto", "x": 0, "y": 0 },
        { "id": "A", "tipo": "punto", "desde": "O", "angulo": 180, "distancia": 300 },
        { "id": "B", "tipo": "punto", "desde": "O", "angulo": 165, "distancia": 260 },
        { "id": "C", "tipo": "punto", "desde": "O", "angulo": 90, "distancia": 240 },
        { "id": "P", "tipo": "punto_bisectriz", "vertice": "O", "desde": "A", "hasta": "C", "distancia": 260 },
        { "id": "OA", "tipo": "rayo", "desde": "O", "hacia": "A" },
        { "id": "OB", "tipo": "rayo", "desde": "O", "hacia": "B" },
        { "id": "OP", "tipo": "rayo", "desde": "O", "hacia": "P" },
        { "id": "OC", "tipo": "rayo", "desde": "O", "hacia": "C" },
        { "id": "angAOB", "tipo": "angulo", "vertice": "O", "desde": "A", "hasta": "B", "radio": 210, "texto": "x", "medir": true, "oculto": true },
        { "id": "angBOC", "tipo": "angulo", "vertice": "O", "desde": "B", "hasta": "C", "radio": 55, "texto": "5x", "medir": true, "oculto": true },
        { "id": "angAOP", "tipo": "angulo", "vertice": "O", "desde": "A", "hasta": "P", "radio": 120, "texto": "45°", "medir": true, "oculto": true },
        { "id": "angPOC", "tipo": "angulo", "vertice": "O", "desde": "P", "hasta": "C", "radio": 120, "texto": "45°", "medir": true, "oculto": true },
        { "id": "angAOC", "tipo": "angulo", "vertice": "O", "desde": "A", "hasta": "C", "recto": true, "oculto": true },
        { "id": "angBOP", "tipo": "angulo", "vertice": "O", "desde": "B", "hasta": "P", "radio": 170, "texto": "?", "medir": true, "oculto": true }
    ]
}'::jsonb,
pasos = '[
    {
        "titulo": "¿Qué nos piden?",
        "explicacion": "Nos piden el ángulo BOP, entre los rayos OB y OP.\nDatos:\n• El ángulo BOC mide 5 veces el ángulo AOB.\n• OP es bisectriz del ángulo AOC.\n• El ángulo POC mide 45°.",
        "formulas": ["m\\angle BOP = \\ ?"],
        "mostrar": ["angBOP"],
        "resaltar": ["angBOP"]
    },
    {
        "titulo": "Lo que no sabemos",
        "explicacion": "Llamamos x al ángulo AOB. Como BOC mide cinco veces AOB, el ángulo BOC mide 5x.",
        "formulas": ["m\\angle AOB = x", "m\\angle BOC = 5x"],
        "mostrar": ["angAOB", "angBOC"],
        "resaltar": ["angAOB", "angBOC"]
    },
    {
        "titulo": "La bisectriz",
        "explicacion": "Una bisectriz parte un ángulo en dos partes iguales. OP es bisectriz de AOC, así que AOP mide lo mismo que POC: 45°.\nEntonces AOC mide 45° + 45° = 90°: es un ángulo recto.",
        "formulas": ["m\\angle AOP = m\\angle POC = 45^\\circ", "m\\angle AOC = 90^\\circ"],
        "mostrar": ["angAOP", "angPOC", "angAOC"],
        "resaltar": ["angAOP", "angPOC", "OP"]
    },
    {
        "titulo": "Plantear la ecuación",
        "explicacion": "El ángulo AOC está formado por AOB y BOC, así que sus medidas suman 90°.",
        "formulas": ["x + 5x = 90^\\circ", "6x = 90^\\circ", "x = 15^\\circ"],
        "resaltar": ["angAOB", "angBOC"]
    },
    {
        "titulo": "Calcular lo pedido",
        "explicacion": "El ángulo BOP es lo que le falta a AOB para llegar a AOP.",
        "formulas": ["m\\angle BOP = m\\angle AOP - m\\angle AOB", "m\\angle BOP = 45^\\circ - 15^\\circ = 30^\\circ"],
        "resaltar": ["angBOP"]
    },
    {
        "titulo": "Comprobación",
        "explicacion": "El laboratorio dibujó la figura con las medidas exactas y midió sus ángulos: BOP mide 30°, igual que nuestro resultado.\nRespuesta: A) 30°",
        "formulas": ["m\\angle BOP = 30^\\circ \\ \\checkmark"],
        "resaltar": ["angBOP"],
        "simular": true,
        "respuesta": true
    }
]'::jsonb
WHERE codigo_banco = 32415;

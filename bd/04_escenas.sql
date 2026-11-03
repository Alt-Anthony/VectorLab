-- Figuras armadas en el laboratorio y su resolución paso a paso, por pregunta.
-- escena: { "unidad": "N" | "kg" | "kgf", "piezas": [{ tipo, x, y, rotacion, valor?, texto?, largo?, ref? }] }
--   valor en unidades internas (kg para bloques y barras, N para fuerzas); largo en píxeles (múltiplo de 20);
--   ref es un nombre para que los pasos puedan resaltar esa pieza.
-- pasos: [{ titulo, explicacion, formulas: [latex], resaltar: [ref], flechas: [{ x, y, dx, dy, largo, texto, sub, despues, lado }],
--           cotas: [{ x, y, largo, texto }], simular, respuesta }]
--   La explicación se dibuja a la izquierda de la figura y las fórmulas (acumuladas) a la derecha.
--   Las coordenadas de flechas y cotas están en el mismo sistema que la escena. Las fórmulas van entre $$...$$.
-- Si la pregunta no existe en la base, el UPDATE no hace nada.

-- Equilibrio y palancas, pregunta 1: varilla de 50 N colgada de dos cuerdas (A y B)
-- y un bloque de 20 N colgado a 3 m de A y 1 m de B (60 px = 1 m). Pide la tensión en B.
UPDATE preguntas SET
escena = '{
    "unidad": "N",
    "piezas": [
        { "tipo": "techo", "x": 700, "y": 140 },
        { "tipo": "techo", "x": 900, "y": 140 },
        { "tipo": "cuerda", "x": 680, "y": 180, "ref": "cuerdaA" },
        { "tipo": "cuerda", "x": 920, "y": 180, "ref": "cuerdaB" },
        { "tipo": "barra", "x": 800, "y": 220, "valor": 5, "ref": "barra" },
        { "tipo": "cuerda", "x": 860, "y": 260, "ref": "cuerdaBloque" },
        { "tipo": "bloque", "x": 860, "y": 320, "valor": 2, "ref": "bloque" },
        { "tipo": "etiqueta", "x": 660, "y": 160, "texto": "A", "ref": "A" },
        { "tipo": "etiqueta", "x": 940, "y": 160, "texto": "B", "ref": "B" },
        { "tipo": "cota", "x": 680, "y": 180, "texto": "3 m", "largo": 180 },
        { "tipo": "cota", "x": 860, "y": 180, "texto": "1 m", "largo": 60 }
    ]
}'::jsonb,
pasos = '[
    {
        "titulo": "¿Qué nos piden?",
        "explicacion": "Nos piden la tensión de la cuerda B.\nDatos:\n• Peso de la varilla: 50 N\n• Peso del bloque: 20 N\n• Distancias: 3 m y 1 m (la varilla mide 4 m)",
        "formulas": ["T_B = \\ ?"],
        "resaltar": ["cuerdaB", "B"],
        "flechas": [
            { "x": 920, "y": 214, "dy": -1, "texto": "T", "sub": "B", "despues": " = ?", "lado": "izquierda" }
        ]
    },
    {
        "titulo": "El sistema",
        "explicacion": "La varilla está en equilibrio: no se traslada ni gira. Entonces las fuerzas y los momentos sobre ella se anulan.",
        "formulas": ["\\sum F = 0", "\\sum M = 0"],
        "resaltar": ["barra"]
    },
    {
        "titulo": "Fuerzas sobre la varilla",
        "explicacion": "Diagrama de cuerpo libre:\n• $$T_A$$ y $$T_B$$: las cuerdas tiran hacia arriba.\n• 50 N: el peso de la varilla, en su centro (a 2 m de A).\n• 20 N: el bloque, a 3 m de A.",
        "formulas": ["T_A + T_B = 50 + 20 = 70\\ \\text{N}"],
        "resaltar": ["barra"],
        "flechas": [
            { "x": 680, "y": 214, "dy": -1, "texto": "T", "sub": "A" },
            { "x": 920, "y": 214, "dy": -1, "texto": "T", "sub": "B", "lado": "izquierda" },
            { "x": 800, "y": 226, "dy": 1, "texto": "50 N" },
            { "x": 860, "y": 226, "dy": 1, "largo": 50, "texto": "20 N" }
        ]
    },
    {
        "titulo": "Punto de giro en A",
        "explicacion": "Tomamos momentos respecto de A: así $$T_A$$ no hace girar la varilla (su brazo es 0) y la única incógnita es $$T_B$$.\nBrazos desde A: $$T_B$$ a 4 m, el peso a 2 m y el bloque a 3 m.",
        "formulas": ["\\sum M_A = 0"],
        "resaltar": ["A"],
        "flechas": [
            { "x": 680, "y": 214, "dy": -1, "texto": "T", "sub": "A" },
            { "x": 920, "y": 214, "dy": -1, "texto": "T", "sub": "B", "lado": "izquierda" },
            { "x": 800, "y": 226, "dy": 1, "texto": "50 N" },
            { "x": 860, "y": 226, "dy": 1, "largo": 50, "texto": "20 N" }
        ],
        "cotas": [{ "x": 680, "y": 200, "largo": 120, "texto": "2 m" }]
    },
    {
        "titulo": "Suma de momentos en A",
        "explicacion": "Lo que hace girar la varilla en un sentido se compensa con lo que la hace girar en el otro.",
        "formulas": ["T_B \\cdot 4 = 50 \\cdot 2 + 20 \\cdot 3", "4\\,T_B = 160", "T_B = 40\\ \\text{N}"],
        "resaltar": ["B"],
        "flechas": [
            { "x": 920, "y": 214, "dy": -1, "texto": "T", "sub": "B", "despues": " = 40 N", "lado": "izquierda" },
            { "x": 800, "y": 226, "dy": 1, "texto": "50 N" },
            { "x": 860, "y": 226, "dy": 1, "largo": 50, "texto": "20 N" }
        ],
        "cotas": [{ "x": 680, "y": 200, "largo": 120, "texto": "2 m" }]
    },
    {
        "titulo": "Comprobación",
        "explicacion": "Reemplazando en la suma de fuerzas sale $$T_A$$. La simulación confirma que la varilla no gira.\nRespuesta: B) 40 N",
        "formulas": ["T_A = 70 - 40 = 30\\ \\text{N}"],
        "simular": true,
        "respuesta": true,
        "flechas": [
            { "x": 680, "y": 214, "dy": -1, "texto": "T", "sub": "A", "despues": " = 30 N" },
            { "x": 920, "y": 214, "dy": -1, "texto": "T", "sub": "B", "despues": " = 40 N", "lado": "izquierda" }
        ]
    }
]'::jsonb
WHERE codigo_banco = 32405;

-- Cursos, temas, preguntas y alternativas.
-- Este archivo solo crea las tablas y los catálogos de cursos y temas.
-- Las preguntas se cargan aparte desde 03_preguntas_datos.sql (no se sube al repositorio).

CREATE TABLE IF NOT EXISTS cursos (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(60) NOT NULL,
    orden SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS temas (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(40) UNIQUE NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS preguntas (
    id SERIAL PRIMARY KEY,
    codigo_banco INTEGER UNIQUE NOT NULL,
    curso_id INTEGER NOT NULL REFERENCES cursos(id),
    tema_id INTEGER NOT NULL REFERENCES temas(id),
    enunciado TEXT NOT NULL,
    imagen VARCHAR(255),
    fuente VARCHAR(120),
    resolucion TEXT
);

-- Figura de la pregunta armada en el laboratorio: [{ tipo, x, y, rotacion, valor }]
ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS escena JSONB;
-- Resolución paso a paso sobre esa figura: [{ titulo, explicacion, resaltar, flechas, cotas, simular, respuesta }]
ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS pasos JSONB;

CREATE TABLE IF NOT EXISTS alternativas (
    id SERIAL PRIMARY KEY,
    pregunta_id INTEGER NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
    letra CHAR(1) NOT NULL,
    texto TEXT NOT NULL,
    es_correcta BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (pregunta_id, letra)
);

INSERT INTO cursos (clave, nombre, orden) VALUES
    ('fisica', 'Física', 1),
    ('geometria', 'Geometría', 2),
    ('trigonometria', 'Trigonometría', 3)
ON CONFLICT (clave) DO NOTHING;

INSERT INTO temas (clave, nombre, descripcion) VALUES
    ('vectores', 'Vectores en el plano', 'Suma de vectores, componentes y método del paralelogramo'),
    ('bloque_fuerzas', 'Fuerzas y plano inclinado', 'Bloques sobre superficies, fricción y segunda ley de Newton'),
    ('proyectil', 'Tiro parabólico', 'Lanzamientos horizontales y oblicuos'),
    ('grafica', 'Gráficas', 'Lectura de gráficas posición-tiempo, temperatura-calor y corriente-voltaje'),
    ('circuito', 'Circuitos eléctricos', 'Resistencias, focos y capacitores en serie y en paralelo'),
    ('palanca_equilibrio', 'Equilibrio y palancas', 'Barras, vigas, poleas y torque'),
    ('pista_energia', 'Conservación de la energía', 'Pistas, péndulos y resortes'),
    ('campos', 'Campos eléctrico y magnético', 'Líneas de campo, potencial, flujo e inducción'),
    ('rotacion', 'Discos y engranajes', 'Movimiento circular y transmisión'),
    ('fluidos', 'Hidrostática', 'Presión en líquidos y flotación'),
    ('triangulo_rectangulo', 'Triángulo rectángulo', 'Pitágoras, razones trigonométricas y ángulos de elevación'),
    ('angulos', 'Ángulos', 'Ángulos entre paralelas, bisectrices y alrededor de un punto'),
    ('poligonos_areas', 'Polígonos y áreas', 'Áreas de regiones sombreadas, trapecios y rectángulos'),
    ('triangulo_semejanza', 'Semejanza de triángulos', 'Teorema de Thales, paralelas y puntos medios'),
    ('circunferencia', 'Circunferencia', 'Cuerdas, tangentes, secantes y ángulos en la circunferencia'),
    ('sector_circular', 'Sector circular', 'Longitud de arco, área de sectores y trapecios circulares'),
    ('solidos', 'Sólidos geométricos', 'Cilindros, conos y troncos'),
    ('plano_cartesiano', 'Plano cartesiano', 'Ecuación de la circunferencia, elipse y reflexiones')
ON CONFLICT (clave) DO NOTHING;

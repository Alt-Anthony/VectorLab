CREATE TABLE IF NOT EXISTS intentos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pregunta_id INTEGER NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
    respuesta TEXT,
    es_correcta BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_intentos_usuario ON intentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_intentos_pregunta ON intentos(pregunta_id);
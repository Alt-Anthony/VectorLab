DROP TABLE IF EXISTS estudiantes;

CREATE TABLE estudiantes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    carrera_postula VARCHAR(80) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO estudiantes (nombre, email, carrera_postula)
VALUES
('Juan Pérez', 'juan@correo.com', 'Ingeniería de Sistemas'),
('María López', 'maria@correo.com', 'Medicina Humana');
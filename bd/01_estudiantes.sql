DROP TABLE IF EXISTS usuarios;

CREATE TABLE
    usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        carrera VARCHAR(100),
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(20) CHECK (rol IN ('admin', 'estudiante')) DEFAULT 'estudiante',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

--Administradores
--Contraseña para todos Administradores: 'admin123'
INSERT INTO
    usuarios (nombre, carrera, email, password_hash, rol)
VALUES
    (
        'Anthony',
        'Administrador',
        'anthony@vectorlab.com',
        '$2b$10$13/O8.0SvhHl1e/Y9bZ82eH203zE2P49oJ1LwW.a4d3x9m.qP/sS2',
        'admin'
    ),
    (
        'Mark',
        'Administrador',
        'mark@vectorlab.com',
        '$2b$10$13/O8.0SvhHl1e/Y9bZ82eH203zE2P49oJ1LwW.a4d3x9m.qP/sS2',
        'admin'
    ),
    (
        'Maria',
        'Administrador',
        'maria@vectorlab.com',
        '$2b$10$13/O8.0SvhHl1e/Y9bZ82eH203zE2P49oJ1LwW.a4d3x9m.qP/sS2',
        'admin'
    );

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    carrera VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('admin', 'estudiante')) DEFAULT 'estudiante',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--datos de prueba
--contraseña
--administradores: admin123
--estudiantes: 123
INSERT INTO usuarios (nombre, carrera, email, password_hash, rol)
VALUES
    ('Anthony', 'Administrador', 'anthony@vectorlab.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.LvH.WCSfp9Wcn2vqGf.V86YpIOo4DeC', 'admin'),
    ('Mark', 'Administrador', 'mark@vectorlab.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.LvH.WCSfp9Wcn2vqGf.V86YpIOo4DeC', 'admin'),
    ('Maria', 'Administrador', 'maria@vectorlab.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.LvH.WCSfp9Wcn2vqGf.V86YpIOo4DeC', 'admin'),
    ('Celeste', 'Educacion', 'celeste@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.cGUDqe8jdmZb.qL51kcOoHHmaVlpYR.', 'estudiante'),
    ('Manuel', 'Sistemas', 'manuel@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.cGUDqe8jdmZb.qL51kcOoHHmaVlpYR.', 'estudiante'),
    ('Bianca', 'Minas', 'bianca@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.cGUDqe8jdmZb.qL51kcOoHHmaVlpYR.', 'estudiante')
    ON CONFLICT (email) DO NOTHING;

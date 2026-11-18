require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const pool = require('./db');
const { verificarSesion } = require('./middlewares/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error('Falta la variable de entorno SESSION_SECRET');
}

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesiones guardadas en PostgreSQL (tabla "sesiones"): sobreviven a los reinicios del servidor.
// Duran 30 días y se renuevan con cada visita (rolling).
const PgSession = require('connect-pg-simple')(session);
const DURACION_SESION_MS = 1000 * 60 * 60 * 24 * 30;

app.use(
  session({
    store: new PgSession({ pool, tableName: 'sesiones', createTableIfMissing: true }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: DURACION_SESION_MS
    }
  })
);

//Deshabilita el cache
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
//Inicio automatico de base de datos: ejecuta en orden todos los .sql de la carpeta bd/
async function inicializarBaseDeDatos() {
  try {
    const carpetaSQL = path.join(__dirname, '../bd');
    const archivos = fs.readdirSync(carpetaSQL).filter((archivo) => archivo.endsWith('.sql')).sort();
    for (const archivo of archivos) {
      await pool.query(fs.readFileSync(path.join(carpetaSQL, archivo), 'utf8'));
    }
    console.log(`Base de datos iniciada (${archivos.join(', ')}).`);
  } catch (error) {
    console.error('Error al iniciar base de datos', error);
  }
}
// API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/perfil', require('./routes/perfil'));
/// Agregando mas rutas
app.use('/api/estudiantes', require('./routes/estudiantes'));
app.use('/api/cursos', require('./routes/cursos'));
app.use('/api/preguntas', require('./routes/preguntas'));
//Ruta para manejo de peticiones de API no encontradas
app.use('/api', (req, res) => {
  res.status(404).json({ status: 'fail', message: 'Endpoint no encontrado' });
});

// Frontend: /priv 
const frontendPath = path.join(__dirname, '../frontend');
app.use('/priv', verificarSesion, express.static(path.join(frontendPath, 'priv')));

// Laboratorio con dirección corta: /laboratorio
app.get('/laboratorio', verificarSesion, (req, res) => {
  res.sendFile(path.join(frontendPath, 'priv/pages/laboratorio.html'));
});

// La geometría ahora está dentro del laboratorio: /geometria abre el laboratorio en la pestaña Geometría
app.get('/geometria', verificarSesion, (req, res) => {
  const parametros = new URLSearchParams({ ...req.query, pestana: 'geometria' });
  res.redirect(`/laboratorio?${parametros}`);
});

// Solución de una pregunta: /solucion?pregunta=ID (pregunta a la izquierda, laboratorio a la derecha)
app.get('/solucion', verificarSesion, (req, res) => {
  res.sendFile(path.join(frontendPath, 'priv/pages/solucion.html'));
});

// Frontend: /pub
app.use('/pub', express.static(path.join(frontendPath, 'pub')));
app.use('/css', express.static(path.join(frontendPath, 'pub/css')));
app.use('/js', express.static(path.join(frontendPath, 'pub/js')));
app.use(express.static(path.join(frontendPath, 'pub/pages')));

app.get('/', (req, res) => {
  res.redirect('/index.html');
});
inicializarBaseDeDatos().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
  });
});
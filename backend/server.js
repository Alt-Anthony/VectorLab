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

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24
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
//Inicio automatico de base de datos
async function inicializarBaseDeDatos() {
  try {
    const rutaSQL = path.join(__dirname, '../bd/01_estudiantes.sql');
    const sql = fs.readFileSync(rutaSQL, 'utf8');
    await pool.query(sql);
    console.log('Base de datos iniciada.');
  } catch (error) {
    console.error('Error al iniciar base de datos', error);
  }
}
// API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/perfil', require('./routes/perfil'));
/// Agregando mas rutas
app.use('/api/estudiantes', require('./routes/estudiantes'));
//Ruta para manejo de peticiones de API no encontradas
app.use('/api', (req, res) => {
  res.status(404).json({ status: 'fail', message: 'Endpoint no encontrado' });
});

// Frontend: /priv 
const frontendPath = path.join(__dirname, '../frontend');
app.use('/priv', verificarSesion, express.static(path.join(frontendPath, 'priv')));

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
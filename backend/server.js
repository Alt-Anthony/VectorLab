require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const { verificarSesion } = require('./middlewares/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'clave_secreta',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 }
  }));

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
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});


require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 }
}));

// API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/perfil', require('./routes/perfil'));

// Frontend: /priv 
const frontendPath = path.join(__dirname, '../frontend');
app.use('/priv', authMiddleware, express.static(path.join(frontendPath, 'priv')));
app.use(express.static(frontendPath));

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
const express = require('express');
const bcrypt = require('bcryptjs');
const users = require('../data/users');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 'fail', message: 'Email y contraseña son obligatorios' });
  }

  const existe = users.find(u => u.email === email);
  if (existe) {
    return res.status(409).json({ status: 'fail', message: 'El email ya está registrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const nuevoUsuario = {
    id: users.length + 1,
    email,
    password: hashedPassword
  };
  users.push(nuevoUsuario);

  res.status(201).json({
    status: 'success',
    user: { id: nuevoUsuario.id, email: nuevoUsuario.email }
  });
});




router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 'fail', message: 'Email y contraseña son obligatorios' });
  }

  const user = users.find(u => u.email === email);

  const coincide = user && await bcrypt.compare(password, user.password);

  if (!coincide) {
    return res.status(401).json({ status: 'fail', message: 'Credenciales inválidas' });
  }

  req.session.userId = user.id;

  res.json({ status: 'success', message: 'Login exitoso' });
});



router.post('/logout', (req, res) => res.json({ message: 'logout pendiente' }));

module.exports = router;
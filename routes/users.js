const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/register', async (req, res) => {
  try {
    const { User } = req.models;
    const { email, password, name } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email già registrata' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, name });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('❌ ERRORE REGISTRAZIONE:', error.message);
    res.status(500).json({ error: 'Errore registrazione' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { User } = req.models;
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenziali non valide' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenziali non valide' });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('❌ ERRORE LOGIN:', error.message);
    res.status(500).json({ error: 'Errore login' });
  }
});

module.exports = router;

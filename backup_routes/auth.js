const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const auth = require('../middleware/auth');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'marketplace_jwt_secret';

router.post('/register', async (req, res) => {
  try {
    const { email, password, username, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password obbligatori' });
    }
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email già registrata' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      username: username || email.split('@')[0],
      name: name || username || email.split('@')[0]
    });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Errore registrazione:', error);
    res.status(500).json({ error: 'Errore registrazione' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password obbligatori' });
    }
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Errore login:', error);
    res.status(500).json({ error: 'Errore login' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'username', 'name', 'role', 'isActive']
    });
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    res.json({ user });
  } catch (error) {
    console.error('❌ Errore profilo:', error);
    res.status(500).json({ error: 'Errore recupero profilo' });
  }
});

module.exports = router;

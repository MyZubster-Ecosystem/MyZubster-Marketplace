// routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'marketplace_jwt_secret';

// ---- REGISTRAZIONE ----
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    console.log('📝 Tentativo registrazione:', { email, name });

    if (!email || !password || !name) {
      console.log('❌ Campi mancanti');
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      console.log('❌ Email già registrata:', email);
      return res.status(400).json({ error: 'Email già registrata' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashata');

    const user = await User.create({
      email,
      password: hashedPassword,
      name
    });

    console.log('✅ Utente creato:', user.id, user.email);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      }
    });

  } catch (error) {
    console.error('❌ ERRORE REGISTRAZIONE:', error.message);
    console.error('❌ STACK:', error.stack);
    if (error.errors) {
      console.error('❌ DETTAGLI:', error.errors.map(e => e.message));
    }
    res.status(500).json({
      error: 'Errore registrazione',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ---- LOGIN ----
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password obbligatori' });
    }

    console.log('🔐 Tentativo login:', email);

    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('❌ Utente non trovato:', email);
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log('❌ Password errata per:', email);
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login riuscito:', email);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      }
    });

  } catch (error) {
    console.error('❌ ERRORE LOGIN:', error.message);
    res.status(500).json({ error: 'Errore login' });
  }
});

// ---- DIVENTA SELLER ----
router.post('/become-seller', auth, async (req, res) => {
  try {
    const { moneroAddress } = req.body;

    if (!moneroAddress) {
      return res.status(400).json({ error: 'Indirizzo Monero obbligatorio' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    user.role = 'seller';
    user.moneroAddress = moneroAddress;
    await user.save();

    console.log('✅ Utente diventato seller:', user.id, user.email);

    res.json({
      message: 'Ora sei un seller!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        moneroAddress: user.moneroAddress
      }
    });

  } catch (error) {
    console.error('❌ ERRORE BECOME-SELLER:', error.message);
    res.status(500).json({ error: 'Errore aggiornamento ruolo' });
  }
});

module.exports = router;
// routes/skills.js
const express = require('express');
const { Skill, User } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// ---- PUBBLICA UNA COMPETENZA (solo seller) ----
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, price, currency = 'USD' } = req.body;

    if (!title || !description || !category || !price) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo i seller possono pubblicare competenze' });
    }

    const skill = await Skill.create({
      name: title,
      description,
      category,
      price,
      currency,
      sellerId: req.user.id,
      isActive: true
    });

    res.status(201).json(skill);
  } catch (error) {
    console.error('❌ Errore creazione competenza:', error.message);
    res.status(500).json({ error: 'Errore creazione competenza' });
  }
});

// ---- LISTA COMPETENZE (pubblica) ----
router.get('/', async (req, res) => {
  try {
    const skills = await Skill.findAll({
      where: { isActive: true },
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(skills);
  } catch (error) {
    console.error('❌ Errore recupero competenze:', error.message);
    res.status(500).json({ error: 'Errore recupero competenze' });
  }
});

// ---- DETTAGLIO COMPETENZA ----
router.get('/:id', async (req, res) => {
  try {
    const skill = await Skill.findByPk(req.params.id, {
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'email'] }]
    });
    if (!skill) {
      return res.status(404).json({ error: 'Competenza non trovata' });
    }
    res.json(skill);
  } catch (error) {
    console.error('❌ Errore recupero competenza:', error.message);
    res.status(500).json({ error: 'Errore recupero competenza' });
  }
});

module.exports = router;
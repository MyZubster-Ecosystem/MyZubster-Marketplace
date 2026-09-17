const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(query) {
  const parsedLimit = Number.parseInt(query.limit, 10);
  const parsedOffset = Number.parseInt(query.offset, 10);
  if ((query.limit !== undefined && (!Number.isInteger(parsedLimit) || parsedLimit < 1)) ||
      (query.offset !== undefined && (!Number.isInteger(parsedOffset) || parsedOffset < 0))) {
    return null;
  }
  return {
    limit: Math.min(parsedLimit || DEFAULT_LIMIT, MAX_LIMIT),
    offset: parsedOffset || 0
  };
}

// Public skill catalogue.
router.get('/', async (req, res) => {
  try {
    const { Skill, User } = req.models;
    const pagination = parsePagination(req.query);
    if (!pagination) {
      return res.status(400).json({ error: 'Parametri di paginazione non validi: limit deve essere maggiore di 0 e offset non può essere negativo' });
    }

    const where = { isActive: true };
    if (req.query.category) where.category = req.query.category;
    if (req.query.sellerId) where.sellerId = req.query.sellerId;

    const { count, rows } = await Skill.findAndCountAll({
      ...pagination,
      where,
      distinct: true,
      order: [['id', 'ASC']],
      include: [{ model: User, as: 'seller', attributes: ['id', 'email'] }]
    });

    res.json({ data: rows, pagination: { total: count, ...pagination, pages: Math.ceil(count / pagination.limit) } });
  } catch (error) {
    console.error('❌ Errore recupero competenze:', error.message);
    res.status(500).json({ error: 'Errore recupero competenze' });
  }
});

// Public skill detail.
router.get('/:id', async (req, res) => {
  try {
    const { Skill, User } = req.models;
    const skill = await Skill.findByPk(req.params.id, {
      include: [{ model: User, as: 'seller', attributes: ['id', 'email'] }]
    });
    if (!skill || !skill.isActive) return res.status(404).json({ error: 'Competenza non trovata' });
    res.json(skill);
  } catch (error) {
    console.error('❌ Errore dettaglio competenza:', error.message);
    res.status(500).json({ error: 'Errore dettaglio competenza' });
  }
});

// Create a skill. price=0 is an explicit FREE listing and requires no payment method.
router.post('/', auth, async (req, res) => {
  try {
    const { Skill } = req.models;
    const name = String(req.body.name || req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const price = Number(req.body.price);
    if (!name || !description || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: 'name/title, description e price >= 0 sono obbligatori' });
    }

    const newSkill = await Skill.create({
      name,
      description,
      price,
      currency: price === 0 ? (req.body.currency || 'USD') : (req.body.currency || 'USD'),
      category: req.body.category || null,
      sellerId: req.user.id,
      isActive: true
    });
    res.status(201).json(newSkill);
  } catch (error) {
    console.error('❌ Errore creazione competenza:', error.message);
    res.status(500).json({ error: 'Errore creazione competenza' });
  }
});

// Update a skill (owner only).
router.put('/:id', auth, async (req, res) => {
  try {
    const { Skill } = req.models;
    const skill = await Skill.findByPk(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Competenza non trovata' });
    if (skill.sellerId !== req.user.id) return res.status(403).json({ error: 'Non autorizzato' });

    const updates = {};
    if (req.body.name !== undefined || req.body.title !== undefined) updates.name = String(req.body.name || req.body.title).trim();
    if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'price deve essere >= 0' });
      updates.price = price;
    }
    if (req.body.currency !== undefined) updates.currency = req.body.currency;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
    if (req.body.status !== undefined) updates.isActive = req.body.status === 'active';

    await skill.update(updates);
    res.json(skill);
  } catch (error) {
    console.error('❌ Errore aggiornamento competenza:', error.message);
    res.status(500).json({ error: 'Errore aggiornamento competenza' });
  }
});

// Delete a skill (owner only).
router.delete('/:id', auth, async (req, res) => {
  try {
    const { Skill } = req.models;
    const skill = await Skill.findByPk(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Competenza non trovata' });
    if (skill.sellerId !== req.user.id) return res.status(403).json({ error: 'Non autorizzato' });
    await skill.destroy();
    res.json({ message: 'Competenza eliminata' });
  } catch (error) {
    console.error('❌ Errore eliminazione competenza:', error.message);
    res.status(500).json({ error: 'Errore eliminazione competenza' });
  }
});

module.exports = router;

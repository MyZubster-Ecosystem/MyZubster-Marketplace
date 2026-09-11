// routes/admin.js
const express = require('express');
const { User, Order, Skill } = require('../models');
const { adminAuth } = require('../middleware/admin');

const router = express.Router();

// ---- Dashboard stats ----
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalOrders = await Order.count();
    const totalSkills = await Skill.count();
    const pendingOrders = await Order.count({ where: { status: 'pending' } });
    const completedOrders = await Order.count({ where: { status: 'completed' } });

    res.json({
      totalUsers,
      totalOrders,
      totalSkills,
      pendingOrders,
      completedOrders
    });
  } catch (error) {
    console.error('❌ Errore stats:', error);
    res.status(500).json({ error: 'Errore recupero statistiche' });
  }
});

// ---- Lista utenti ----
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'username', 'fullName', 'role', 'isActive', 'createdAt']
    });
    res.json(users);
  } catch (error) {
    console.error('❌ Errore utenti:', error);
    res.status(500).json({ error: 'Errore recupero utenti' });
  }
});

// ---- Lista ordini ----
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: User, as: 'buyer', attributes: ['id', 'email', 'username'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    console.error('❌ Errore ordini:', error);
    res.status(500).json({ error: 'Errore recupero ordini' });
  }
});

// ---- Aggiorna ruolo utente ----
router.put('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'seller', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Ruolo non valido' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'Ruolo aggiornato', user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error('❌ Errore aggiornamento ruolo:', error);
    res.status(500).json({ error: 'Errore aggiornamento ruolo' });
  }
});

module.exports = router;
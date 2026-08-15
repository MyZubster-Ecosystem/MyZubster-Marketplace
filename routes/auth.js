const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = 'myzubster-secret-key';

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password });
    await user.save();
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ success: true, data: { user, token } });
  } catch (error) {
    console.error('❌ ERRORE REGISTRAZIONE:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ success: true, data: { user, token } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

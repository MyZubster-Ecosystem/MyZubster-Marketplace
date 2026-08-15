const express = require('express');
const router = express.Router();
const Garden = require('../models/Garden');

router.get('/', async (req, res) => {
  try {
    const gardens = await Garden.find({ isPublic: true });
    res.json({ success: true, data: gardens, count: gardens.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const garden = new Garden(req.body);
    await garden.save();
    res.status(201).json({ success: true, data: garden });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

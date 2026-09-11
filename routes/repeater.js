const express = require('express');
const router = express.Router();
const Repeater = require('../models/Repeater');

// Register repeater
router.post('/register', async (req, res) => {
  try {
    const { repeaterId, name, location, parentId, children } = req.body;
    
    if (!repeaterId || !name || !location) {
      return res.status(400).json({ error: 'repeaterId, name and location are required' });
    }
    
    const repeater = new Repeater({
      repeaterId,
      name,
      location,
      parentId,
      children: children || []
    });
    
    await repeater.save();
    res.status(201).json({ success: true, data: repeater });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all repeaters
router.get('/list', async (req, res) => {
  try {
    const repeaters = await Repeater.find({ status: 'active' });
    res.json({ success: true, data: repeaters, count: repeaters.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get repeater status
router.get('/status/:repeaterId', async (req, res) => {
  try {
    const repeater = await Repeater.findOne({ repeaterId: req.params.repeaterId });
    if (!repeater) {
      return res.status(404).json({ error: 'Repeater not found' });
    }
    res.json({ success: true, data: repeater });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route message
router.post('/route', async (req, res) => {
  try {
    const { sourceId, targetId, message } = req.body;
    if (!sourceId || !targetId || !message) {
      return res.status(400).json({ error: 'sourceId, targetId and message are required' });
    }
    // Implementazione routing semplificata
    res.json({ 
      success: true, 
      data: { 
        source: sourceId, 
        target: targetId, 
        message,
        route: [sourceId, 'REP-001', targetId],
        status: 'routed'
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

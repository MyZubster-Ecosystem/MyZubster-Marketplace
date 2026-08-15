const express = require('express');
const router = express.Router();
const Antenna = require('../models/Antenna');

// Register antenna
router.post('/register', async (req, res) => {
  try {
    const { antennaId, name, location, protocol, metadata } = req.body;
    
    if (!antennaId || !name || !location) {
      return res.status(400).json({ error: 'antennaId, name and location are required' });
    }
    
    const antenna = new Antenna({
      antennaId,
      name,
      location,
      protocol: protocol || 'mqtt',
      metadata
    });
    
    await antenna.save();
    res.status(201).json({ success: true, data: antenna });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all antennas
router.get('/list', async (req, res) => {
  try {
    const antennas = await Antenna.find({ status: 'active' });
    res.json({ success: true, data: antennas, count: antennas.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get antenna status
router.get('/status/:antennaId', async (req, res) => {
  try {
    const antenna = await Antenna.findOne({ antennaId: req.params.antennaId });
    if (!antenna) {
      return res.status(404).json({ error: 'Antenna not found' });
    }
    res.json({ success: true, data: antenna });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update antenna status
router.put('/status/:antennaId', async (req, res) => {
  try {
    const { status } = req.body;
    const antenna = await Antenna.findOne({ antennaId: req.params.antennaId });
    if (!antenna) {
      return res.status(404).json({ error: 'Antenna not found' });
    }
    antenna.status = status;
    antenna.lastPing = new Date();
    await antenna.save();
    res.json({ success: true, data: antenna });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

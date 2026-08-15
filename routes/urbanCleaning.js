const express = require('express');
const router = express.Router();
const UrbanCleaningService = require('../services/urbanCleaningService');

// Registra robot
router.post('/register', async (req, res) => {
  try {
    const robot = await UrbanCleaningService.registerRobot(req.body);
    res.status(201).json({ success: true, data: robot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Spazzamento
router.post('/sweep', async (req, res) => {
  try {
    const { robotId, route } = req.body;
    const result = await UrbanCleaningService.startSweeping(robotId, route);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ritiro rifiuti
router.post('/collect-waste', async (req, res) => {
  try {
    const { robotId, wasteType, amount } = req.body;
    const result = await UrbanCleaningService.collectWaste(robotId, wasteType, amount);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ritiro ingombranti
router.post('/bulky-pickup', async (req, res) => {
  try {
    const { robotId, address, items } = req.body;
    const result = await UrbanCleaningService.bulkyWastePickup(robotId, address, items);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lavaggio strade
router.post('/wash-street', async (req, res) => {
  try {
    const { robotId, street, duration } = req.body;
    const result = await UrbanCleaningService.streetWashing(robotId, street, duration);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Monitoraggio
router.post('/monitor', async (req, res) => {
  try {
    const { robotId, zone } = req.body;
    const result = await UrbanCleaningService.monitorStreet(robotId, zone);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistiche Hera
router.get('/hera-stats', async (req, res) => {
  try {
    const stats = await UrbanCleaningService.getHeraStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista robot
router.get('/list', async (req, res) => {
  try {
    const robots = await UrbanCleaningRobot.find();
    res.json({ success: true, data: robots, count: robots.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

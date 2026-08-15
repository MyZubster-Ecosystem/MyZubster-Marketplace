const express = require('express');
const router = express.Router();
const HydraulicRobotService = require('../services/hydraulicRobotService');

// Registra robot
router.post('/register', async (req, res) => {
  try {
    const robot = await HydraulicRobotService.registerRobot(req.body);
    res.status(201).json({ success: true, data: robot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pulizia piscina
router.post('/clean-pool', async (req, res) => {
  try {
    const { robotId, poolSize, debrisType } = req.body;
    const result = await HydraulicRobotService.cleanPool(robotId, poolSize, debrisType);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pulizia condotte
router.post('/clean-pipeline', async (req, res) => {
  try {
    const { robotId, diameter, pressure } = req.body;
    const result = await HydraulicRobotService.cleanPipeline(robotId, diameter, pressure);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Emergenza idraulica
router.post('/emergency', async (req, res) => {
  try {
    const { robotId, issue, location } = req.body;
    const result = await HydraulicRobotService.emergencyPlumbing(robotId, issue, location);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mappatura umidità
router.post('/moisture-map', async (req, res) => {
  try {
    const { robotId, fieldSize } = req.body;
    const result = await HydraulicRobotService.mapSoilMoisture(robotId, fieldSize);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistiche
router.get('/stats', async (req, res) => {
  try {
    const stats = await HydraulicRobotService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista robot
router.get('/list', async (req, res) => {
  try {
    const robots = await HydraulicRobot.find();
    res.json({ success: true, data: robots, count: robots.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const CarpenterRobotService = require('../services/carpenterRobotService');

// Registra robot
router.post('/register', async (req, res) => {
  try {
    const robot = await CarpenterRobotService.registerRobot(req.body);
    res.status(201).json({ success: true, data: robot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Intaglio CNC
router.post('/cnc', async (req, res) => {
  try {
    const { robotId, designFile, material } = req.body;
    const result = await CarpenterRobotService.cncCarving(robotId, designFile, material);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Produzione mobili
router.post('/furniture', async (req, res) => {
  try {
    const { robotId, pieceType, quantity } = req.body;
    const result = await CarpenterRobotService.furnitureProduction(robotId, pieceType, quantity);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Costruzione strutture
router.post('/construction', async (req, res) => {
  try {
    const { robotId, structureType, dimensions } = req.body;
    const result = await CarpenterRobotService.timberConstruction(robotId, structureType, dimensions);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Intaglio artistico
router.post('/artistic', async (req, res) => {
  try {
    const { robotId, design, material, complexity } = req.body;
    const result = await CarpenterRobotService.artisticCarving(robotId, design, material, complexity);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Genera G-code
router.post('/gcode', async (req, res) => {
  try {
    const { design, material } = req.body;
    const gcode = CarpenterRobotService.generateGCode(design, material);
    res.json({ success: true, data: { gcode } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistiche
router.get('/stats', async (req, res) => {
  try {
    const stats = await CarpenterRobotService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista robot
router.get('/list', async (req, res) => {
  try {
    const robots = await CarpenterRobot.find();
    res.json({ success: true, data: robots, count: robots.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

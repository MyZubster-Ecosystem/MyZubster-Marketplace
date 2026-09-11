const express = require('express');
const router = express.Router();
const ConstructionRobotService = require('../services/constructionRobotService');

// Registra robot
router.post('/register', async (req, res) => {
  try {
    const robot = await ConstructionRobotService.registerRobot(req.body);
    res.status(201).json({ success: true, data: robot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stampa 3D edificio
router.post('/print-building', async (req, res) => {
  try {
    const { robotId, buildingSize, material } = req.body;
    const result = await ConstructionRobotService.printBuilding(robotId, buildingSize, material);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Posizionamento mattoni
router.post('/lay-bricks', async (req, res) => {
  try {
    const { robotId, count, pattern } = req.body;
    const result = await ConstructionRobotService.layBricks(robotId, count, pattern);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ispezione drone
router.post('/inspect', async (req, res) => {
  try {
    const { robotId, structureHeight } = req.body;
    const result = await ConstructionRobotService.inspectStructure(robotId, structureHeight);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Demolizione selettiva
router.post('/demolish', async (req, res) => {
  try {
    const { robotId, material, area } = req.body;
    const result = await ConstructionRobotService.selectiveDemolition(robotId, material, area);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scavo
router.post('/excavate', async (req, res) => {
  try {
    const { robotId, depth, area } = req.body;
    const result = await ConstructionRobotService.excavation(robotId, depth, area);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistiche
router.get('/stats', async (req, res) => {
  try {
    const stats = await ConstructionRobotService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista robot
router.get('/list', async (req, res) => {
  try {
    const robots = await ConstructionRobot.find();
    res.json({ success: true, data: robots, count: robots.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

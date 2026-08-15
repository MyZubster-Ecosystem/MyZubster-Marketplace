const express = require('express');
const router = express.Router();
const NurseRobotService = require('../services/nurseRobotService');

// Registra robot infermiere
router.post('/register', async (req, res) => {
  try {
    const robot = await NurseRobotService.registerRobot(req.body);
    res.status(201).json({ success: true, data: robot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assegna task
router.post('/task', async (req, res) => {
  try {
    const { robotId, task } = req.body;
    const job = await NurseRobotService.assignTask(robotId, task);
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trasporto farmaci (Moxi)
router.post('/transport', async (req, res) => {
  try {
    const { robotId, from, to, medication } = req.body;
    const result = await NurseRobotService.transportMedication(robotId, from, to, medication);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Monitoraggio cognitivo (Teo)
router.post('/cognitive', async (req, res) => {
  try {
    const { robotId, patientId } = req.body;
    const result = await NurseRobotService.cognitiveMonitoring(robotId, patientId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assistenza SLA (Alter-Ego)
router.post('/sla', async (req, res) => {
  try {
    const { robotId, patientId, task } = req.body;
    const result = await NurseRobotService.slaAssistance(robotId, patientId, task);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Igiene (Robot OSS)
router.post('/hygiene', async (req, res) => {
  try {
    const { robotId, patientId } = req.body;
    const result = await NurseRobotService.hygieneAssistance(robotId, patientId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistiche
router.get('/stats', async (req, res) => {
  try {
    const stats = await NurseRobotService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista robot
router.get('/list', async (req, res) => {
  try {
    const robots = await NurseRobot.find();
    res.json({ success: true, data: robots, count: robots.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

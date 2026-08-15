const express = require('express');
const router = express.Router();
const AcademicRobotService = require('../services/academicRobotService');

// Registra robot universitario
router.post('/register', async (req, res) => {
  try {
    const robot = await AcademicRobotService.registerRobot(req.body);
    res.status(201).json({ success: true, data: robot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista robot accademici
router.get('/list', async (req, res) => {
  try {
    const robots = await AcademicRobotService.getAllRobots();
    res.json({ success: true, data: robots, count: robots.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Robot per università
router.get('/university/:name', async (req, res) => {
  try {
    const robots = await AcademicRobotService.getRobotsByUniversity(req.params.name);
    res.json({ success: true, data: robots, count: robots.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Integra AGROBOT T.O.M.
router.post('/integrate/agrobot', async (req, res) => {
  try {
    const { gardenId, cropType } = req.body;
    const result = await AcademicRobotService.integrateAGROBOT(gardenId, cropType);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Integra LabAssist
router.post('/integrate/labassist', async (req, res) => {
  try {
    const { task } = req.body;
    const result = await AcademicRobotService.integrateLabAssist(task);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simula Field Robot Event
router.get('/field-robot-event/:challenge', async (req, res) => {
  try {
    const results = await AcademicRobotService.simulateFieldRobotEvent(req.params.challenge);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

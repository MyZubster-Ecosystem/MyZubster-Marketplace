const express = require('express');
const router = express.Router();
const RobotArmService = require('../services/robotArm');

router.post('/move', (req, res) => {
  const { x, y, z } = req.body;
  res.json({ success: true, data: RobotArmService.moveTo(x, y, z) });
});

router.post('/grip', (req, res) => {
  res.json({ success: true, data: RobotArmService.grip() });
});

router.post('/release', (req, res) => {
  res.json({ success: true, data: RobotArmService.release() });
});

router.post('/plant', (req, res) => {
  const { x, y, z, seedType } = req.body;
  res.json({ success: true, data: RobotArmService.plantSeed(x, y, z, seedType) });
});

router.post('/water', (req, res) => {
  const { x, y, z, amount } = req.body;
  res.json({ success: true, data: RobotArmService.water(x, y, z, amount) });
});

router.post('/harvest', (req, res) => {
  const { x, y, z, crop } = req.body;
  res.json({ success: true, data: RobotArmService.harvest(x, y, z, crop) });
});

router.get('/status', (req, res) => {
  res.json({ success: true, data: RobotArmService });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const RobotScheduler = require('../services/robotScheduler');

router.post('/add', (req, res) => {
  const { robotId, task, priority } = req.body;
  const job = RobotScheduler.addJob(robotId, task, priority);
  res.json({ success: true, data: job });
});

router.post('/execute', async (req, res) => {
  const job = await RobotScheduler.executeNext();
  res.json({ success: true, data: job });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: RobotScheduler.getStats() });
});

module.exports = router;

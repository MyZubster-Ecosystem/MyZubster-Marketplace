const express = require('express');
const router = express.Router();
const DashboardService = require('../services/dashboardService');

router.get('/', (req, res) => {
  res.json({ success: true, data: DashboardService.getDashboard() });
});

router.post('/update', (req, res) => {
  const { key, value } = req.body;
  const result = DashboardService.updateMetric(key, value);
  res.json({ success: true, data: result });
});

router.get('/history', (req, res) => {
  res.json({ success: true, data: DashboardService.history });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const GardenMapService = require('../services/gardenMapService');

router.post('/add', (req, res) => {
  const garden = GardenMapService.addGarden(req.body);
  res.json({ success: true, data: garden });
});

router.get('/nearby', (req, res) => {
  const { lat, lng, radius } = req.query;
  const gardens = GardenMapService.getNearbyGardens(parseFloat(lat), parseFloat(lng), parseFloat(radius));
  res.json({ success: true, data: gardens });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: GardenMapService.getStats() });
});

module.exports = router;

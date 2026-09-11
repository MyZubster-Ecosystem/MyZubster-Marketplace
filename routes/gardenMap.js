const express = require('express');
const router = express.Router();
const GardenMapService = require('../services/gardenMapService');
const authenticate = require('../middleware/auth');
const { LocationPrivacyError } = require('../services/locationPrivacyService');

router.post('/add', authenticate, (req, res) => {
  try {
    const garden = GardenMapService.addGarden(req.body, req.user.id);
    res.status(201).json({ success: true, data: garden });
  } catch (error) {
    if (error instanceof LocationPrivacyError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Unable to add garden' });
  }
});

router.get('/nearby', (req, res) => {
  const { lat, lng, radius } = req.query;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const parsedRadius = radius === undefined ? 10 : Number(radius);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng) || !Number.isFinite(parsedRadius) || parsedRadius <= 0) {
    return res.status(400).json({ error: 'Valid lat, lng and positive radius are required' });
  }
  const gardens = GardenMapService.getNearbyGardens(parsedLat, parsedLng, parsedRadius);
  res.json({ success: true, data: gardens });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: GardenMapService.getStats() });
});

module.exports = router;

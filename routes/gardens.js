const express = require('express');
const router = express.Router();
const Garden = require('../models/Garden');
const authenticate = require('../middleware/auth');
const {
  LocationPrivacyError,
  protectGardenLocation,
  publicGarden
} = require('../services/locationPrivacyService');

router.get('/', async (req, res) => {
  try {
    const gardens = await Garden.find({ isPublic: true }).lean();
    const data = gardens.map(publicGarden);
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/mine', authenticate, async (req, res) => {
  try {
    const gardens = await Garden.find({ userId: String(req.user.id) }).lean();
    res.json({ success: true, data: gardens.map(publicGarden), count: gardens.length });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load gardens' });
  }
});

router.post('/register', authenticate, async (req, res) => {
  try {
    const protectedLocation = protectGardenLocation(req.body);
    const garden = new Garden({
      name: req.body.name,
      size: req.body.size,
      crops: req.body.crops,
      type: req.body.type,
      status: req.body.status,
      isPublic: req.body.isPublic === true,
      userId: String(req.user.id),
      address: protectedLocation.publicAddress,
      comune: protectedLocation.publicCity,
      country: protectedLocation.publicCountry,
      location: protectedLocation.publicLocation,
      locationVisibility: protectedLocation.locationVisibility,
      locationPrecision: protectedLocation.locationPrecision,
      locationConsentVersion: protectedLocation.locationConsentVersion,
      locationConsentedAt: protectedLocation.locationConsentedAt,
      privateLocation: protectedLocation.privateLocation
    });
    await garden.save();
    res.status(201).json({ success: true, data: publicGarden(garden) });
  } catch (error) {
    if (error instanceof LocationPrivacyError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Unable to register garden' });
  }
});

module.exports = router;

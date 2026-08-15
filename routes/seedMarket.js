const express = require('express');
const router = express.Router();
const SeedMarketService = require('../services/seedMarketService');

router.post('/list', (req, res) => {
  const listing = SeedMarketService.createListing(req.body);
  res.json({ success: true, data: listing });
});

router.post('/purchase', (req, res) => {
  const { listingId, quantity } = req.body;
  try {
    const order = SeedMarketService.purchase(listingId, quantity);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/listings', (req, res) => {
  res.json({ success: true, data: SeedMarketService.getListings() });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: SeedMarketService.getStats() });
});

module.exports = router;

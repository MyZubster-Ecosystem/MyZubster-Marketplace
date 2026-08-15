const express = require('express');
const router = express.Router();
const SubscriptionService = require('../services/subscriptionService');

router.post('/create', (req, res) => {
  const subscription = SubscriptionService.createSubscription(req.body);
  res.json({ success: true, data: subscription });
});

router.post('/renew', (req, res) => {
  const processed = SubscriptionService.processRenewals();
  res.json({ success: true, data: { processed } });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: SubscriptionService.getStats() });
});

module.exports = router;

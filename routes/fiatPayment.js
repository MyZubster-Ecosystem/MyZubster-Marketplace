const express = require('express');
const router = express.Router();
const FiatPaymentService = require('../services/fiatPaymentService');

router.post('/create', (req, res) => {
  const payment = FiatPaymentService.createPayment(req.body);
  res.json({ success: true, data: payment });
});

router.get('/convert', (req, res) => {
  const { amount, from, to } = req.query;
  const result = FiatPaymentService.convert(parseFloat(amount), from, to);
  res.json({ success: true, data: { amount, from, to, result } });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: FiatPaymentService.getStats() });
});

module.exports = router;

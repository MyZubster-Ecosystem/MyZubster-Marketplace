const express = require('express');
const router = express.Router();
const CryptoPaymentService = require('../services/cryptoPaymentService');

router.post('/create', (req, res) => {
  const payment = CryptoPaymentService.createPayment(req.body);
  res.json({ success: true, data: payment });
});

router.get('/convert', (req, res) => {
  const { amount, from, to } = req.query;
  const result = CryptoPaymentService.convert(parseFloat(amount), from, to);
  res.json({ success: true, data: { amount, from, to, result } });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: CryptoPaymentService.getStats() });
});

module.exports = router;

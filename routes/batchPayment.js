const express = require('express');
const router = express.Router();
const BatchPaymentService = require('../services/batchPaymentService');

router.post('/create', (req, res) => {
  try {
    const batch = BatchPaymentService.createBatch(req.body);
    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/add-payment', (req, res) => {
  const { batchId, recipient, amount, currency } = req.body;
  const payment = BatchPaymentService.addPaymentToBatch(batchId, { recipient, amount, currency });
  res.json({ success: true, data: payment });
});

router.post('/execute/:batchId', (req, res) => {
  try {
    const batch = BatchPaymentService.executeBatch(req.params.batchId);
    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: BatchPaymentService.getStats() });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const BatchPaymentService = require('../services/batchPaymentService');
const authenticate = require('../middleware/auth');
const { requireDatabaseReady } = require('../middleware/databaseReady');
const {
  ALL_CURRENCIES,
  normalizeCurrency,
  normalizeRecipient,
  parsePositiveAmount
} = require('../middleware/paymentValidation');

router.use(authenticate, requireDatabaseReady);

function validatedPayment(data) {
  const amount = parsePositiveAmount(data?.amount);
  const currency = normalizeCurrency(data?.currency, ALL_CURRENCIES);
  const recipient = normalizeRecipient(data?.recipient);
  if (amount === null || currency === null || recipient === null) return null;
  return { amount, currency, recipient };
}

router.post('/create', (req, res) => {
  try {
    const rawPayments = req.body?.payments ?? [];
    if (!Array.isArray(rawPayments) || rawPayments.length > 100) {
      return res.status(400).json({ error: 'payments must be an array with at most 100 entries' });
    }
    const payments = rawPayments.map(validatedPayment);
    if (payments.some(payment => payment === null)) {
      return res.status(400).json({ error: 'Every batch payment must contain a valid amount, currency and recipient' });
    }
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 100) : 'Batch Payment';
    const batch = BatchPaymentService.createBatch({ name: name || 'Batch Payment', payments });
    return res.status(201).json({ success: true, data: batch });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/add-payment', (req, res) => {
  try {
    const paymentInput = validatedPayment(req.body);
    if (!paymentInput || typeof req.body?.batchId !== 'string') {
      return res.status(400).json({ error: 'batchId and a valid payment are required' });
    }
    const payment = BatchPaymentService.addPaymentToBatch(req.body.batchId, paymentInput);
    return res.status(201).json({ success: true, data: payment });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/execute/:batchId', (req, res) => {
  try {
    const batch = BatchPaymentService.executeBatch(req.params.batchId);
    return res.json({ success: true, data: batch });
  } catch (error) {
    const status = error.code === 'SETTLEMENT_PROVIDER_NOT_CONFIGURED' ? 503 : 400;
    return res.status(status).json({ error: error.message, code: error.code });
  }
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: BatchPaymentService.getStats() });
});

module.exports = router;

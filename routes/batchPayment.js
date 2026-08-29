const express = require('express');
const router = express.Router();
const BatchPaymentService = require('../services/batchPaymentService');
const authenticate = require('../middleware/auth');
const { requireDatabaseReady } = require('../middleware/databaseReady');
const {
  ALL_CURRENCIES,
  normalizeCurrency,
  normalizePaymentAmount,
  normalizeRecipient,
} = require('../middleware/paymentValidation');

router.use(authenticate, requireDatabaseReady);

function validatedPayment(data) {
  const amount = normalizePaymentAmount(data?.amount);
  const currency = normalizeCurrency(data?.currency, ALL_CURRENCIES);
  const recipient = normalizeRecipient(data?.recipient);
  if (amount === null || currency === null || recipient === null) return null;
  return { amount, currency, recipient };
}

function validBatchId(value) {
  return typeof value === 'string' && /^BATCH-[0-9a-f-]{36}$/.test(value);
}

function handleServiceError(res, error) {
  if (error.code === 'BATCH_NOT_FOUND') {
    return res.status(404).json({ error: 'Batch not found', code: error.code });
  }
  if (error.code === 'SETTLEMENT_PROVIDER_NOT_CONFIGURED') {
    return res.status(503).json({ error: error.message, code: error.code });
  }
  console.error('Batch payment storage failed:', error.message);
  return res.status(503).json({ error: 'Batch payment storage unavailable', code: 'PAYMENT_STORAGE_UNAVAILABLE' });
}

router.post('/create', async (req, res) => {
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
    const batch = await BatchPaymentService.createBatch(
      { name: name || 'Batch Payment', payments },
      req.user.id
    );
    return res.status(201).json({ success: true, data: batch });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

router.post('/add-payment', async (req, res) => {
  try {
    const paymentInput = validatedPayment(req.body);
    if (!paymentInput || !validBatchId(req.body?.batchId)) {
      return res.status(400).json({ error: 'batchId and a valid payment are required' });
    }
    const payment = await BatchPaymentService.addPaymentToBatch(req.body.batchId, paymentInput, req.user.id);
    return res.status(201).json({ success: true, data: payment });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

router.post('/execute/:batchId', async (req, res) => {
  try {
    if (!validBatchId(req.params.batchId)) {
      return res.status(404).json({ error: 'Batch not found', code: 'BATCH_NOT_FOUND' });
    }
    const batch = await BatchPaymentService.executeBatch(req.params.batchId, req.user.id);
    return res.json({ success: true, data: batch });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

router.get('/stats', async (req, res) => {
  try {
    return res.json({ success: true, data: await BatchPaymentService.getStats(req.user.id) });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

module.exports = router;

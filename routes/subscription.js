const express = require('express');
const router = express.Router();
const SubscriptionService = require('../services/subscriptionService');
const authenticate = require('../middleware/auth');
const { requireDatabaseReady } = require('../middleware/databaseReady');
const {
  CRYPTO_CURRENCIES,
  normalizeCurrency,
  normalizePaymentAmount,
  normalizeRecipient,
} = require('../middleware/paymentValidation');

router.use(authenticate, requireDatabaseReady);

function handleServiceError(res, error) {
  if (error.code === 'SETTLEMENT_PROVIDER_NOT_CONFIGURED') {
    return res.status(503).json({ error: error.message, code: error.code });
  }
  console.error('Subscription storage failed:', error.message);
  return res.status(503).json({ error: 'Subscription storage unavailable', code: 'PAYMENT_STORAGE_UNAVAILABLE' });
}

router.post('/create', async (req, res) => {
  const amount = normalizePaymentAmount(req.body?.amount);
  const currency = normalizeCurrency(req.body?.currency, CRYPTO_CURRENCIES);
  const subscriber = normalizeRecipient(req.body?.subscriber);
  const intervals = new Set(['daily', 'weekly', 'monthly', 'yearly']);
  const interval = intervals.has(req.body?.interval) ? req.body.interval : null;

  if (amount === null || currency === null || subscriber === null || interval === null) {
    return res.status(400).json({ error: 'A valid amount, currency, subscriber and interval are required' });
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 100) : 'Subscription';
  try {
    const subscription = await SubscriptionService.createSubscription({
      amount,
      currency,
      subscriber,
      interval,
      name: name || 'Subscription'
    }, req.user.id);
    return res.status(202).json({ success: true, data: subscription });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

router.post('/renew', (req, res) => {
  try {
    const processed = SubscriptionService.processRenewals(req.user.id);
    return res.json({ success: true, data: { processed } });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

router.get('/stats', async (req, res) => {
  try {
    return res.json({ success: true, data: await SubscriptionService.getStats(req.user.id) });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

module.exports = router;

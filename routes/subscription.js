const express = require('express');
const router = express.Router();
const SubscriptionService = require('../services/subscriptionService');
const authenticate = require('../middleware/auth');
const { requireDatabaseReady } = require('../middleware/databaseReady');
const {
  CRYPTO_CURRENCIES,
  normalizeCurrency,
  normalizeRecipient,
  parsePositiveAmount
} = require('../middleware/paymentValidation');

router.use(authenticate, requireDatabaseReady);

router.post('/create', (req, res) => {
  const amount = parsePositiveAmount(req.body?.amount);
  const currency = normalizeCurrency(req.body?.currency, CRYPTO_CURRENCIES);
  const subscriber = normalizeRecipient(req.body?.subscriber);
  const intervals = new Set(['daily', 'weekly', 'monthly', 'yearly']);
  const interval = intervals.has(req.body?.interval) ? req.body.interval : null;

  if (amount === null || currency === null || subscriber === null || interval === null) {
    return res.status(400).json({ error: 'A valid amount, currency, subscriber and interval are required' });
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 100) : 'Subscription';
  const subscription = SubscriptionService.createSubscription({
    amount,
    currency,
    subscriber,
    interval,
    name: name || 'Subscription'
  });
  return res.status(202).json({ success: true, data: subscription });
});

router.post('/renew', (req, res) => {
  try {
    const processed = SubscriptionService.processRenewals();
    return res.json({ success: true, data: { processed } });
  } catch (error) {
    const status = error.code === 'SETTLEMENT_PROVIDER_NOT_CONFIGURED' ? 503 : 500;
    return res.status(status).json({ error: error.message, code: error.code });
  }
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: SubscriptionService.getStats() });
});

module.exports = router;

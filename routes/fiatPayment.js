const express = require('express');
const router = express.Router();
const FiatPaymentService = require('../services/fiatPaymentService');
const authenticate = require('../middleware/auth');
const { requireDatabaseReady } = require('../middleware/databaseReady');
const {
  FIAT_CURRENCIES,
  validateConversionQuery,
  validatePaymentBody
} = require('../middleware/paymentValidation');

router.use(authenticate, requireDatabaseReady);

router.post('/create', validatePaymentBody(FIAT_CURRENCIES), async (req, res) => {
  try {
    const payment = await FiatPaymentService.createPaymentIntent(req.validatedPayment, req.user.id);
    return res.status(202).json({ success: true, data: payment });
  } catch (error) {
    console.error('Fiat payment intent creation failed:', error.message);
    return res.status(503).json({ error: 'Payment intent storage unavailable', code: 'PAYMENT_STORAGE_UNAVAILABLE' });
  }
});

router.get('/convert', validateConversionQuery(FIAT_CURRENCIES), (req, res) => {
  const { amount, from, to } = req.validatedConversion;
  const result = FiatPaymentService.convert(amount, from, to);
  res.json({
    success: true,
    data: { amount, from, to, result, rateType: 'indicative_static', settlementEligible: false }
  });
});

router.get('/stats', async (req, res) => {
  try {
    return res.json({ success: true, data: await FiatPaymentService.getStats(req.user.id) });
  } catch (error) {
    return res.status(503).json({ error: 'Payment intent storage unavailable', code: 'PAYMENT_STORAGE_UNAVAILABLE' });
  }
});

module.exports = router;

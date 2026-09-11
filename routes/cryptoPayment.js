const express = require('express');
const router = express.Router();
const CryptoPaymentService = require('../services/cryptoPaymentService');
const authenticate = require('../middleware/auth');
const { requireDatabaseReady } = require('../middleware/databaseReady');
const {
  CRYPTO_CURRENCIES,
  validateConversionQuery,
  validatePaymentBody
} = require('../middleware/paymentValidation');

router.use(authenticate, requireDatabaseReady);

router.post('/create', validatePaymentBody(CRYPTO_CURRENCIES), async (req, res) => {
  try {
    const payment = await CryptoPaymentService.createPaymentIntent(req.validatedPayment, req.user.id);
    return res.status(202).json({ success: true, data: payment });
  } catch (error) {
    console.error('Crypto payment intent creation failed:', error.message);
    return res.status(503).json({ error: 'Payment intent storage unavailable', code: 'PAYMENT_STORAGE_UNAVAILABLE' });
  }
});

router.get('/convert', validateConversionQuery(CRYPTO_CURRENCIES), (req, res) => {
  const { amount, from, to } = req.validatedConversion;
  const result = CryptoPaymentService.convert(amount, from, to);
  res.json({
    success: true,
    data: { amount, from, to, result, rateType: 'indicative_static', settlementEligible: false }
  });
});

router.get('/stats', async (req, res) => {
  try {
    return res.json({ success: true, data: await CryptoPaymentService.getStats(req.user.id) });
  } catch (error) {
    return res.status(503).json({ error: 'Payment intent storage unavailable', code: 'PAYMENT_STORAGE_UNAVAILABLE' });
  }
});

module.exports = router;

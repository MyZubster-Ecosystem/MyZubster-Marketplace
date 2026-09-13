const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const ConversionGatewayService = require('../services/conversionGatewayService');

router.use(authenticate);

router.get('/capabilities', (req, res) => {
  return res.json({
    success: true,
    data: {
      supportedAssets: ConversionGatewayService.listSupportedAssets(),
      executionMode: 'external_authorized_provider_only',
      custody: false,
      internalExchange: false
    }
  });
});

router.post('/quote', async (req, res) => {
  try {
    const quote = await ConversionGatewayService.createQuote(req.body || {}, { userId: req.user.id });
    return res.json({ success: true, data: quote });
  } catch (error) {
    const status = error.code === 'CONVERSION_PROVIDER_UNAVAILABLE' ? 503 : 400;
    return res.status(status).json({
      success: false,
      error: error.message,
      code: error.code || 'INVALID_CONVERSION_REQUEST'
    });
  }
});

router.post('/convert', async (req, res) => {
  try {
    const result = await ConversionGatewayService.executeQuote(req.body || {}, { userId: req.user.id });
    return res.status(202).json({ success: true, data: result });
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: error.message,
      code: error.code || 'CONVERSION_EXECUTION_UNAVAILABLE'
    });
  }
});

module.exports = router;

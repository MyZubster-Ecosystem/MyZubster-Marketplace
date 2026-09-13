const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireDatabaseReady } = require('../middleware/databaseReady');
const ConversionGatewayService = require('../services/conversionGatewayService');

router.use(authenticate, requireDatabaseReady);

router.get('/capabilities', (req, res) => {
  return res.json({
    success: true,
    data: {
      supportedAssets: ConversionGatewayService.listSupportedAssets(),
      configuredProviders: ConversionGatewayService.listProviders(),
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
    const status = ['CONVERSION_PROVIDER_UNAVAILABLE', 'CONVERSION_AUDIT_UNAVAILABLE'].includes(error.code) ? 503 : 400;
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
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const clientCodes = [
      'INVALID_CONVERSION_REQUEST',
      'CONVERSION_QUOTE_NOT_FOUND',
      'CONVERSION_QUOTE_EXPIRED',
      'CONVERSION_ALREADY_SETTLED'
    ];
    const status = clientCodes.includes(error.code) ? 400 : 503;
    return res.status(status).json({
      success: false,
      error: error.message,
      code: error.code || 'CONVERSION_EXECUTION_UNAVAILABLE'
    });
  }
});

router.get('/audit/:quoteId', async (req, res) => {
  try {
    const events = await ConversionGatewayService.getAuditTrail(req.params.quoteId, req.user.id);
    return res.json({ success: true, data: events });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: error.code || 'CONVERSION_AUDIT_REQUEST_INVALID'
    });
  }
});

module.exports = router;

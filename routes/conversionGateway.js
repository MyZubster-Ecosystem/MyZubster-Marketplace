const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireDatabaseReady } = require('../middleware/databaseReady');
const ConversionGatewayService = require('../services/conversionGatewayService');
const MyzAssetIdentityService = require('../services/myzAssetIdentityService');
const MyzRedemptionReconciliationService = require('../services/myzRedemptionReconciliationService');

router.use(authenticate, requireDatabaseReady);

router.get('/capabilities', (req, res) => {
  return res.json({
    success: true,
    data: {
      supportedAssets: ConversionGatewayService.listSupportedAssets(),
      configuredProviders: ConversionGatewayService.listProviders(),
      candidateProviders: ConversionGatewayService.listCandidateProviders(),
      redemptionProviders: MyzRedemptionReconciliationService.listProviders(),
      myz: MyzAssetIdentityService.getStatus(),
      executionMode: 'external_authorized_provider_only',
      custody: false,
      internalExchange: false
    }
  });
});

router.get('/myz-status', (req, res) => {
  return res.json({ success: true, data: MyzAssetIdentityService.getStatus() });
});

router.post('/provider-probe', async (req, res) => {
  try {
    const result = await ConversionGatewayService.probeCandidateProvider(req.body || {});
    return res.json({ success: true, data: result });
  } catch (error) {
    const providerUnavailable = [
      'CANDIDATE_PROVIDER_UNAVAILABLE',
      'PROVIDER_PAIR_UNSUPPORTED',
      'PROVIDER_SANDBOX_MARKET_DATA_UNAVAILABLE'
    ].includes(error.code);
    return res.status(providerUnavailable ? 503 : 400).json({
      success: false,
      error: error.message,
      code: error.code || 'CANDIDATE_PROVIDER_PROBE_FAILED'
    });
  }
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

router.post('/redemption/start', async (req, res) => {
  try {
    const result = await MyzRedemptionReconciliationService.start(req.body || {}, { userId: req.user.id });
    return res.status(202).json({ success: true, data: result });
  } catch (error) {
    const clientCodes = [
      'MYZ_INTERNAL_CREDIT_ONLY',
      'MYZ_SETTLEMENT_CONFIGURATION_INCOMPLETE',
      'MYZ_REDEMPTION_MODE_REQUIRED',
      'INVALID_MYZ_REDEMPTION_REQUEST',
      'INVALID_MYZ_REDEMPTION_QUOTE'
    ];
    const status = clientCodes.includes(error.code) ? 400 : 503;
    return res.status(status).json({
      success: false,
      error: error.message,
      code: error.code || 'MYZ_REDEMPTION_UNAVAILABLE'
    });
  }
});

router.get('/redemption/:redemptionId', async (req, res) => {
  try {
    const result = await MyzRedemptionReconciliationService.getStatus(req.params.redemptionId, req.user.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Redemption not found for authenticated user',
        code: 'MYZ_REDEMPTION_NOT_FOUND'
      });
    }
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: error.message,
      code: error.code || 'MYZ_REDEMPTION_STATUS_UNAVAILABLE'
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

const express = require('express');
const authenticate = require('../middleware/auth');
const { requireDatabaseReady } = require('../middleware/databaseReady');

const router = express.Router();

router.use(authenticate, requireDatabaseReady);

function payoutProviderUnavailable(req, res) {
  return res.status(503).json({
    error: 'Independent payout provider is not configured',
    code: 'PAYOUT_PROVIDER_NOT_CONFIGURED'
  });
}

router.get('/balance', payoutProviderUnavailable);
router.post('/withdraw', payoutProviderUnavailable);
router.get('/history', payoutProviderUnavailable);

module.exports = router;

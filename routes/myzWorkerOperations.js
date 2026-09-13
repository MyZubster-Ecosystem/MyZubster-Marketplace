'use strict';

const express = require('express');
const router = express.Router();
const { requireDatabaseReady } = require('../middleware/databaseReady');
const { requireMyzWorkerRegistryRead } = require('../middleware/myzWorkerRegistryAuth');
const MyzWorkerOperationRegistryService = require('../services/myzWorkerOperationRegistryService');

router.use(requireDatabaseReady, requireMyzWorkerRegistryRead);

router.get('/lookup', async (req, res) => {
  try {
    const data = await MyzWorkerOperationRegistryService.lookup({
      redemptionId: req.query.redemptionId,
      reservationId: req.query.reservationId,
      quoteId: req.query.quoteId,
      providerTransactionId: req.query.providerTransactionId
    });
    return res.json(data);
  } catch (error) {
    const status = error.code === 'INVALID_MYZ_WORKER_LOOKUP' ? 400 : 503;
    return res.status(status).json({
      success: false,
      code: error.code || 'MYZ_WORKER_REGISTRY_LOOKUP_UNAVAILABLE',
      error: error.message
    });
  }
});

module.exports = router;

'use strict';

const crypto = require('crypto');
const WorkerRegistry = require('./myzWorkerOperationRegistryService');

function sleep(ms) {
  return ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve();
}

class MyzRedemptionSettlementWorkerService {
  constructor(options = {}) {
    this.registry = options.registry || WorkerRegistry;
    this.owner = String(options.owner || process.env.MYZ_SETTLEMENT_WORKER_OWNER || `marketplace:${process.pid}`);
    this.leaseMs = Number(options.leaseMs || process.env.MYZ_SETTLEMENT_WORKER_LEASE_MS || 30000);
    this.maxAttempts = Math.max(1, Number(options.maxAttempts || process.env.MYZ_SETTLEMENT_WORKER_MAX_ATTEMPTS || 1));
    this.retryDelayMs = Math.max(0, Number(options.retryDelayMs || process.env.MYZ_SETTLEMENT_WORKER_RETRY_DELAY_MS || 0));
  }

  operationId(redemptionId) {
    const normalized = String(redemptionId || '').trim();
    if (!normalized) throw new TypeError('redemptionId is required for settlement worker');
    return `MYZ-SETTLEMENT-${crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32)}`;
  }

  isRetryable(error) {
    // Fail closed: automatic retry is opt-in from a reviewed provider adapter.
    return Boolean(error && error.retryable === true);
  }

  async ensureQueued(input) {
    const operationId = this.operationId(input.redemptionId);
    try {
      await this.registry.createQueued({
        operationId,
        operationType: 'myz-provider-settlement',
        redemptionId: input.redemptionId,
        reservationId: input.reservationId,
        quoteId: input.quoteId,
        attempt: 0,
        maxAttempts: this.maxAttempts,
        metadata: {
          provider: input.providerName || null,
          toAsset: input.toAsset || null
        }
      });
    } catch (error) {
      if (!(error && error.code === 11000)) throw error;
    }
    return operationId;
  }

  async run(input = {}) {
    if (!input.provider || typeof input.provider.executeExternalSettlement !== 'function') {
      throw new TypeError('Reviewed settlement provider is required');
    }
    if (typeof input.provider.validateSettlementEvidence !== 'function') {
      throw new TypeError('Settlement provider evidence validator is required');
    }

    const operationId = await this.ensureQueued(input);
    let lastError;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const lease = await this.registry.acquireLease(operationId, this.owner, this.leaseMs);
      if (!lease) {
        const error = new Error('Settlement worker lease could not be acquired');
        error.code = 'MYZ_SETTLEMENT_WORKER_LEASE_UNAVAILABLE';
        throw error;
      }

      try {
        const rawSettlement = await input.provider.executeExternalSettlement({
          redemptionId: input.redemptionId,
          quoteId: input.quoteId,
          reservationId: input.reservationId,
          toAsset: input.toAsset,
          expectedRecipientAmount: input.expectedRecipientAmount,
          requestedBy: input.requestedBy,
          idempotencyKey: input.idempotencyKey
        });
        const settlement = input.provider.validateSettlementEvidence(rawSettlement);

        await this.registry.markCompleted(operationId, this.owner, {
          providerTransactionId: settlement.providerTransactionId || null,
          metadata: {
            provider: input.providerName || null,
            toAsset: settlement.toAsset || input.toAsset || null,
            recipientAmount: settlement.recipientAmount || null,
            settledAt: settlement.settledAt || null
          }
        });

        return { operationId, settlement };
      } catch (error) {
        lastError = error;
        const canRetry = attempt < this.maxAttempts && this.isRetryable(error);
        if (!canRetry) {
          await this.registry.markFailed(operationId, this.owner, error.code || 'MYZ_PROVIDER_SETTLEMENT_FAILED');
          throw error;
        }

        const nextRetryAt = new Date(Date.now() + this.retryDelayMs);
        await this.registry.markRetry(operationId, this.owner, nextRetryAt, error.code || 'MYZ_PROVIDER_SETTLEMENT_RETRYABLE');
        await sleep(this.retryDelayMs);
      }
    }

    throw lastError || new Error('MYZ settlement worker exhausted attempts');
  }
}

module.exports = new MyzRedemptionSettlementWorkerService();
module.exports.MyzRedemptionSettlementWorkerService = MyzRedemptionSettlementWorkerService;

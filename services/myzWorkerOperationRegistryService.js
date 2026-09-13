'use strict';

const crypto = require('crypto');
const MyzWorkerOperation = require('../models/MyzWorkerOperation');

const ACTIVE = new Set(['queued', 'running', 'retrying']);
const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

function iso(value) {
  return value instanceof Date ? value.toISOString() : value ? new Date(value).toISOString() : null;
}

function stableRevision(operation) {
  const payload = JSON.stringify({
    operationId: operation?.operationId || null,
    status: operation?.status || 'not_found',
    attempt: operation?.attempt ?? null,
    maxAttempts: operation?.maxAttempts ?? null,
    leaseExpiresAt: iso(operation?.leaseExpiresAt),
    nextRetryAt: iso(operation?.nextRetryAt),
    updatedAt: iso(operation?.updatedAt)
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

class MyzWorkerOperationRegistryService {
  constructor(options = {}) {
    this.model = options.model || MyzWorkerOperation;
    this.now = options.now || (() => new Date());
  }

  async createQueued(input = {}) {
    const operationId = String(input.operationId || '').trim();
    const operationType = String(input.operationType || '').trim();
    if (!operationId || !operationType) {
      const error = new Error('operationId and operationType are required');
      error.code = 'INVALID_MYZ_WORKER_OPERATION';
      throw error;
    }
    return this.model.create({
      operationId,
      operationType,
      status: 'queued',
      redemptionId: input.redemptionId || null,
      reservationId: input.reservationId || null,
      quoteId: input.quoteId || null,
      providerTransactionId: input.providerTransactionId || null,
      attempt: Number(input.attempt || 0),
      maxAttempts: Number(input.maxAttempts || 1),
      nextRetryAt: input.nextRetryAt || null,
      metadata: input.metadata || undefined
    });
  }

  async acquireLease(operationId, owner, leaseMs = 30000) {
    const now = this.now();
    const leaseExpiresAt = new Date(now.getTime() + Number(leaseMs));
    return this.model.findOneAndUpdate({
      operationId: String(operationId),
      status: { $in: ['queued', 'retrying'] },
      $or: [
        { leaseExpiresAt: null },
        { leaseExpiresAt: { $exists: false } },
        { leaseExpiresAt: { $lte: now } }
      ]
    }, {
      $set: {
        status: 'running',
        leaseOwner: String(owner || ''),
        leaseExpiresAt,
        startedAt: now,
        nextRetryAt: null
      },
      $inc: { attempt: 1 }
    }, { new: true });
  }

  async markRetry(operationId, owner, nextRetryAt, errorCode = null) {
    const operation = await this.model.findOne({ operationId: String(operationId) });
    if (!operation || TERMINAL.has(operation.status)) return null;
    if (operation.leaseOwner && String(operation.leaseOwner) !== String(owner || '')) return null;
    operation.status = 'retrying';
    operation.nextRetryAt = nextRetryAt ? new Date(nextRetryAt) : this.now();
    operation.leaseOwner = null;
    operation.leaseExpiresAt = null;
    operation.lastErrorCode = errorCode || null;
    return operation.save();
  }

  async markCompleted(operationId, owner) {
    const operation = await this.model.findOne({ operationId: String(operationId) });
    if (!operation || TERMINAL.has(operation.status)) return operation;
    if (operation.leaseOwner && String(operation.leaseOwner) !== String(owner || '')) return null;
    operation.status = 'completed';
    operation.completedAt = this.now();
    operation.leaseOwner = null;
    operation.leaseExpiresAt = null;
    operation.nextRetryAt = null;
    return operation.save();
  }

  async lookup(selectors = {}) {
    const clauses = [];
    for (const [key, value] of Object.entries({
      redemptionId: selectors.redemptionId,
      reservationId: selectors.reservationId,
      quoteId: selectors.quoteId,
      providerTransactionId: selectors.providerTransactionId
    })) {
      const normalized = String(value || '').trim();
      if (normalized) clauses.push({ [key]: normalized });
    }
    if (!clauses.length) {
      const error = new Error('At least one operation lookup selector is required');
      error.code = 'INVALID_MYZ_WORKER_LOOKUP';
      throw error;
    }

    const candidates = await this.model.find({ $or: clauses }).sort({ updatedAt: -1 }).limit(20).lean();
    if (!candidates.length) {
      return {
        schema: 'myzubster-in-flight-operation-evidence/v1',
        status: 'not_found',
        redemptionId: selectors.redemptionId || null,
        reservationId: selectors.reservationId || null,
        quoteId: selectors.quoteId || null,
        providerTransactionId: selectors.providerTransactionId || null,
        operationId: null,
        operationType: null,
        attempt: null,
        maxAttempts: null,
        leaseExpiresAt: null,
        nextRetryAt: null,
        startedAt: null,
        completedAt: null,
        evidenceRevision: stableRevision(null)
      };
    }

    const active = candidates.find(item => ACTIVE.has(item.status));
    const operation = active || candidates[0];
    return {
      schema: 'myzubster-in-flight-operation-evidence/v1',
      status: operation.status,
      redemptionId: operation.redemptionId || null,
      reservationId: operation.reservationId || null,
      quoteId: operation.quoteId || null,
      providerTransactionId: operation.providerTransactionId || null,
      operationId: operation.operationId,
      operationType: operation.operationType,
      attempt: operation.attempt,
      maxAttempts: operation.maxAttempts,
      leaseExpiresAt: iso(operation.leaseExpiresAt),
      nextRetryAt: iso(operation.nextRetryAt),
      startedAt: iso(operation.startedAt),
      completedAt: iso(operation.completedAt),
      evidenceRevision: stableRevision(operation)
    };
  }
}

module.exports = new MyzWorkerOperationRegistryService();
module.exports.MyzWorkerOperationRegistryService = MyzWorkerOperationRegistryService;
module.exports.stableRevision = stableRevision;

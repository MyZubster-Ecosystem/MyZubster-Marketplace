'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MyzRedemptionSettlementWorkerService } = require('../services/myzRedemptionSettlementWorkerService');

function baseInput(provider) {
  return {
    provider,
    providerName: 'mock-provider',
    redemptionId: 'RED-1',
    reservationId: 'MYZR-1',
    quoteId: 'QUOTE-1',
    toAsset: 'EUR',
    expectedRecipientAmount: '2.5',
    requestedBy: 'alice',
    idempotencyKey: 'idem-1'
  };
}

function registryHarness() {
  const calls = [];
  return {
    calls,
    createQueued: async input => { calls.push(['createQueued', input]); return input; },
    acquireLease: async (operationId, owner, leaseMs) => {
      calls.push(['acquireLease', { operationId, owner, leaseMs }]);
      return { operationId, owner };
    },
    markRetry: async (operationId, owner, nextRetryAt, errorCode) => {
      calls.push(['markRetry', { operationId, owner, nextRetryAt, errorCode }]);
      return { status: 'retrying' };
    },
    markCompleted: async (operationId, owner, patch) => {
      calls.push(['markCompleted', { operationId, owner, patch }]);
      return { status: 'completed' };
    },
    markFailed: async (operationId, owner, errorCode) => {
      calls.push(['markFailed', { operationId, owner, errorCode }]);
      return { status: 'failed' };
    }
  };
}

test('settlement worker records queued -> running -> completed with provider tx evidence', async () => {
  const registry = registryHarness();
  const provider = {
    executeExternalSettlement: async () => ({ providerTransactionId: 'P-TX-1', toAsset: 'EUR', recipientAmount: '2.5', settledAt: '2026-09-13T03:00:00.000Z' }),
    validateSettlementEvidence: value => value
  };
  const worker = new MyzRedemptionSettlementWorkerService({ registry, owner: 'worker-a', maxAttempts: 1, leaseMs: 5000 });
  const result = await worker.run(baseInput(provider));

  assert.equal(result.settlement.providerTransactionId, 'P-TX-1');
  assert.equal(registry.calls[0][0], 'createQueued');
  assert.equal(registry.calls[1][0], 'acquireLease');
  assert.equal(registry.calls[2][0], 'markCompleted');
  assert.equal(registry.calls[2][1].patch.providerTransactionId, 'P-TX-1');
});

test('retryable provider failure is persisted as retrying and reacquired before completion', async () => {
  const registry = registryHarness();
  let executions = 0;
  const provider = {
    executeExternalSettlement: async () => {
      executions += 1;
      if (executions === 1) {
        const error = new Error('temporary provider timeout');
        error.code = 'PROVIDER_TIMEOUT';
        error.retryable = true;
        throw error;
      }
      return { providerTransactionId: 'P-TX-2', toAsset: 'EUR', recipientAmount: '2.5' };
    },
    validateSettlementEvidence: value => value
  };
  const worker = new MyzRedemptionSettlementWorkerService({ registry, owner: 'worker-a', maxAttempts: 2, retryDelayMs: 0 });
  const result = await worker.run(baseInput(provider));

  assert.equal(executions, 2);
  assert.equal(result.settlement.providerTransactionId, 'P-TX-2');
  assert.ok(registry.calls.some(([name]) => name === 'markRetry'));
  assert.equal(registry.calls.filter(([name]) => name === 'acquireLease').length, 2);
  assert.equal(registry.calls.at(-1)[0], 'markCompleted');
});

test('non-retryable provider failure becomes terminal failed and is never retried', async () => {
  const registry = registryHarness();
  let executions = 0;
  const provider = {
    executeExternalSettlement: async () => {
      executions += 1;
      const error = new Error('provider rejected request');
      error.code = 'PROVIDER_REJECTED';
      throw error;
    },
    validateSettlementEvidence: value => value
  };
  const worker = new MyzRedemptionSettlementWorkerService({ registry, owner: 'worker-a', maxAttempts: 3 });

  await assert.rejects(() => worker.run(baseInput(provider)), /provider rejected request/);
  assert.equal(executions, 1);
  assert.equal(registry.calls.at(-1)[0], 'markFailed');
  assert.equal(registry.calls.at(-1)[1].errorCode, 'PROVIDER_REJECTED');
});

test('automatic retry stays fail-closed unless provider explicitly marks the error retryable', () => {
  const worker = new MyzRedemptionSettlementWorkerService({ registry: registryHarness() });
  assert.equal(worker.isRetryable(new Error('timeout')), false);
  const error = new Error('reviewed transient condition');
  error.retryable = true;
  assert.equal(worker.isRetryable(error), true);
});

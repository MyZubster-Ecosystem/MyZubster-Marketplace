'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MyzWorkerOperationRegistryService } = require('../services/myzWorkerOperationRegistryService');
const { MyzWorkerLeaseRecoverySweeperService } = require('../services/myzWorkerLeaseRecoverySweeperService');
const MyzInFlightOperationEvidenceAdapter = require('../services/myzInFlightOperationEvidenceAdapter');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function fakeModel(seed = []) {
  const rows = seed.map(item => ({ ...item }));
  return {
    rows,
    find(query) {
      let matches = rows.filter(row => {
        if (query.status && row.status !== query.status) return false;
        if (query.leaseExpiresAt) {
          const lease = row.leaseExpiresAt ? new Date(row.leaseExpiresAt) : null;
          if (query.leaseExpiresAt.$ne === null && lease === null) return false;
          if (query.leaseExpiresAt.$lte && (!lease || lease > query.leaseExpiresAt.$lte)) return false;
        }
        return true;
      });
      return {
        sort() { matches = matches.sort((a, b) => new Date(a.leaseExpiresAt || 0) - new Date(b.leaseExpiresAt || 0)); return this; },
        limit(n) { matches = matches.slice(0, n); return this; },
        async lean() { return clone(matches); }
      };
    },
    async findOneAndUpdate(query, update) {
      const row = rows.find(item => item.operationId === query.operationId && item.status === query.status &&
        String(new Date(item.leaseExpiresAt).toISOString()) === String(new Date(query.leaseExpiresAt).toISOString()));
      if (!row) return null;
      const set = update.$set || {};
      for (const [key, value] of Object.entries(set)) {
        if (key.startsWith('metadata.')) {
          row.metadata = row.metadata || {};
          row.metadata[key.slice('metadata.'.length)] = value;
        } else {
          row[key] = value;
        }
      }
      row.updatedAt = new Date('2026-09-13T04:00:00.000Z');
      return row;
    }
  };
}

test('expired running lease is quarantined into recovery_required without retry scheduling', async () => {
  const now = new Date('2026-09-13T04:00:00.000Z');
  const model = fakeModel([{
    operationId: 'OP-EXPIRED',
    operationType: 'myz-provider-settlement',
    status: 'running',
    redemptionId: 'RED-1',
    reservationId: 'MYZR-1',
    attempt: 1,
    maxAttempts: 3,
    leaseOwner: 'worker-a',
    leaseExpiresAt: new Date('2026-09-13T03:59:00.000Z'),
    metadata: { provider: 'reviewed-provider' }
  }]);
  const registry = new MyzWorkerOperationRegistryService({ model, now: () => now });

  const changed = await registry.quarantineExpiredRunning(10);
  assert.equal(changed.length, 1);
  assert.equal(changed[0].status, 'recovery_required');
  assert.equal(changed[0].leaseOwner, null);
  assert.equal(changed[0].leaseExpiresAt, null);
  assert.equal(changed[0].nextRetryAt, null);
  assert.equal(changed[0].lastErrorCode, 'MYZ_SETTLEMENT_LEASE_EXPIRED_AMBIGUOUS');
  assert.equal(changed[0].metadata.recoveryReason, 'expired_running_lease');
  assert.equal(changed[0].metadata.previousLeaseOwner, 'worker-a');
});

test('non-expired or non-running operations are not quarantined', async () => {
  const now = new Date('2026-09-13T04:00:00.000Z');
  const model = fakeModel([
    { operationId: 'OP-FUTURE', status: 'running', leaseExpiresAt: new Date('2026-09-13T04:05:00.000Z') },
    { operationId: 'OP-RETRY', status: 'retrying', leaseExpiresAt: new Date('2026-09-13T03:55:00.000Z') }
  ]);
  const registry = new MyzWorkerOperationRegistryService({ model, now: () => now });
  const changed = await registry.quarantineExpiredRunning(10);
  assert.equal(changed.length, 0);
});

test('recovery sweeper delegates only to quarantine and never executes settlement', async () => {
  const calls = [];
  const sweeper = new MyzWorkerLeaseRecoverySweeperService({
    registry: {
      quarantineExpiredRunning: async limit => {
        calls.push(limit);
        return [{ operationId: 'OP-1' }, { operationId: 'OP-2' }];
      }
    },
    batchSize: 25,
    intervalMs: 1000
  });
  const result = await sweeper.sweepOnce();
  assert.deepEqual(calls, [25]);
  assert.equal(result.quarantined, 2);
  assert.deepEqual(result.operationIds, ['OP-1', 'OP-2']);
});

test('recovery_required worker evidence remains active and blocks release-oriented repair paths', async () => {
  const adapter = new MyzInFlightOperationEvidenceAdapter({
    baseUrl: 'http://worker.test',
    reviewed: true,
    httpClient: {
      get: async () => ({ data: {
        schema: 'myzubster-in-flight-operation-evidence/v1',
        status: 'recovery_required',
        redemptionId: 'RED-1',
        reservationId: 'MYZR-1',
        operationId: 'OP-1',
        operationType: 'myz-provider-settlement',
        attempt: 1,
        maxAttempts: 3
      } })
    }
  });
  const evidence = await adapter.collect({
    redemption: { redemptionId: 'RED-1' },
    reservation: { redemptionId: 'RED-1', reservationId: 'MYZR-1' }
  });
  assert.equal(evidence.inFlightOperationStatus.status, 'active');
  assert.equal(evidence.inFlightOperationStatus.workerStatus, 'recovery_required');
});

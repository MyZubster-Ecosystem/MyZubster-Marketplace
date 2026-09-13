'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MyzWorkerOperationRegistryService, stableRevision } = require('../services/myzWorkerOperationRegistryService');

function fakeModel(seed = []) {
  const rows = seed.map(item => ({ ...item }));
  return {
    rows,
    async create(doc) {
      const row = { ...doc, createdAt: new Date(), updatedAt: new Date() };
      rows.push(row);
      return row;
    },
    find(query) {
      const matches = rows.filter(row => query.$or.some(clause => {
        const [key, value] = Object.entries(clause)[0];
        return row[key] === value;
      }));
      return {
        sort() { return this; },
        limit() { return this; },
        async lean() { return matches.map(item => ({ ...item })); }
      };
    }
  };
}

test('worker registry lookup returns not_found evidence when no operation matches', async () => {
  const service = new MyzWorkerOperationRegistryService({ model: fakeModel() });
  const result = await service.lookup({ redemptionId: 'RED-1' });
  assert.equal(result.schema, 'myzubster-in-flight-operation-evidence/v1');
  assert.equal(result.status, 'not_found');
  assert.equal(result.redemptionId, 'RED-1');
  assert.match(result.evidenceRevision, /^[a-f0-9]{64}$/);
});

test('worker registry prefers active operation over newer terminal operation', async () => {
  const now = new Date('2026-09-13T03:00:00.000Z');
  const service = new MyzWorkerOperationRegistryService({ model: fakeModel([
    {
      operationId: 'OP-COMPLETE', operationType: 'settlement', status: 'completed', redemptionId: 'RED-1',
      attempt: 1, maxAttempts: 3, updatedAt: new Date('2026-09-13T03:00:00.000Z'), completedAt: now
    },
    {
      operationId: 'OP-RETRY', operationType: 'settlement', status: 'retrying', redemptionId: 'RED-1',
      attempt: 2, maxAttempts: 3, updatedAt: new Date('2026-09-13T02:59:00.000Z'), nextRetryAt: new Date('2026-09-13T03:05:00.000Z')
    }
  ]) });
  const result = await service.lookup({ redemptionId: 'RED-1' });
  assert.equal(result.status, 'retrying');
  assert.equal(result.operationId, 'OP-RETRY');
  assert.equal(result.attempt, 2);
});

test('worker registry createQueued persists retry and correlation references', async () => {
  const model = fakeModel();
  const service = new MyzWorkerOperationRegistryService({ model });
  const created = await service.createQueued({
    operationId: 'OP-1',
    operationType: 'provider-settlement',
    redemptionId: 'RED-1',
    reservationId: 'MYZR-1',
    quoteId: 'Q-1',
    maxAttempts: 5
  });
  assert.equal(created.status, 'queued');
  assert.equal(created.redemptionId, 'RED-1');
  assert.equal(created.reservationId, 'MYZR-1');
  assert.equal(created.maxAttempts, 5);
});

test('worker registry lookup requires at least one immutable selector', async () => {
  const service = new MyzWorkerOperationRegistryService({ model: fakeModel() });
  await assert.rejects(() => service.lookup({}), /selector is required/);
});

test('worker evidence revision changes with operation state', () => {
  const base = { operationId: 'OP-1', status: 'queued', attempt: 0, maxAttempts: 3, updatedAt: new Date('2026-09-13T03:00:00.000Z') };
  assert.notEqual(stableRevision(base), stableRevision({ ...base, status: 'running', attempt: 1 }));
});

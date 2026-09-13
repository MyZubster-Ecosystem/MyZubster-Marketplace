'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const MyzInFlightOperationEvidenceAdapter = require('../services/myzInFlightOperationEvidenceAdapter');
const { findingPreview } = require('../services/myzReconciliationRepairPreviewService');

const NOW = '2026-09-13T03:00:00.000Z';

function report(overrides = {}) {
  return {
    redemption: {
      redemptionId: 'RED-1',
      quoteId: 'QUOTE-1',
      providerTransactionId: null,
      ...overrides.redemption
    },
    reservation: {
      redemptionId: 'RED-1',
      reservationId: 'MYZR-1',
      ...overrides.reservation
    }
  };
}

test('in-flight evidence maps active worker state to active and preserves operation metadata', async () => {
  const calls = [];
  const adapter = new MyzInFlightOperationEvidenceAdapter({
    baseUrl: 'http://worker.test',
    apiKey: 'worker-token',
    reviewed: true,
    httpClient: {
      get: async (url, options) => {
        calls.push({ url, options });
        return { data: {
          schema: 'myzubster-in-flight-operation-evidence/v1',
          status: 'retrying',
          redemptionId: 'RED-1',
          reservationId: 'MYZR-1',
          operationId: 'OP-1',
          operationType: 'provider-settlement',
          attempt: 2,
          maxAttempts: 5,
          nextRetryAt: '2026-09-13T03:05:00.000Z',
          evidenceRevision: 'worker-rev-1'
        } };
      }
    }
  });

  const evidence = await adapter.collect(report());
  assert.equal(evidence.inFlightOperationStatus.verified, true);
  assert.equal(evidence.inFlightOperationStatus.status, 'active');
  assert.equal(evidence.inFlightOperationStatus.workerStatus, 'retrying');
  assert.equal(evidence.inFlightOperationStatus.operationId, 'OP-1');
  assert.equal(calls[0].url, 'http://worker.test/operations/lookup');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer worker-token');
  assert.equal(calls[0].options.params.redemptionId, 'RED-1');
  assert.equal(calls[0].options.params.reservationId, 'MYZR-1');
});

test('terminal or absent worker state maps to verified none', async () => {
  for (const workerStatus of ['not_found', 'completed', 'failed', 'cancelled']) {
    const adapter = new MyzInFlightOperationEvidenceAdapter({
      baseUrl: 'http://worker.test',
      reviewed: true,
      httpClient: {
        get: async () => ({ data: {
          schema: 'myzubster-in-flight-operation-evidence/v1',
          status: workerStatus,
          redemptionId: 'RED-1',
          reservationId: 'MYZR-1'
        } })
      }
    });
    const evidence = await adapter.collect(report());
    assert.equal(evidence.inFlightOperationStatus.status, 'none');
    assert.equal(evidence.inFlightOperationStatus.verified, true);
    assert.equal(evidence.workerOperationStatus.status, workerStatus);
  }
});

test('active worker evidence blocks stale reservation release review even when other evidence is trusted', () => {
  const preview = findingPreview(
    { code: 'STALE_RESERVATION', severity: 'medium', message: 'stale' },
    {
      providerSettlementStatus: { verified: true, source: 'provider-evidence', checkedAt: NOW, status: 'not_found' },
      canonicalDebitStatus: { verified: true, source: 'canonical-ledger', checkedAt: NOW, status: 'not_found' },
      inFlightOperationStatus: { verified: true, source: 'myz-in-flight-operation-evidence', checkedAt: NOW, status: 'active', workerStatus: 'running' }
    }
  );
  assert.equal(preview.decision, 'WOULD_BLOCK');
  assert.deepEqual(preview.missingEvidence, []);
  assert.ok(preview.evidenceConflicts.some(item => item.key === 'inFlightOperationStatus' && item.status === 'active'));
});

test('no active worker plus no settlement/debit allows review but never automated repair', () => {
  const preview = findingPreview(
    { code: 'STALE_RESERVATION', severity: 'medium', message: 'stale' },
    {
      providerSettlementStatus: { verified: true, source: 'provider-evidence', checkedAt: NOW, status: 'not_found' },
      canonicalDebitStatus: { verified: true, source: 'canonical-ledger', checkedAt: NOW, status: 'not_found' },
      inFlightOperationStatus: { verified: true, source: 'myz-in-flight-operation-evidence', checkedAt: NOW, status: 'none', workerStatus: 'not_found' }
    }
  );
  assert.equal(preview.decision, 'WOULD_ALLOW_REVIEW');
  assert.equal(preview.automatedRepairAllowed, false);
});

test('in-flight evidence rejects unknown states and mismatched references', async () => {
  const unknown = new MyzInFlightOperationEvidenceAdapter({
    baseUrl: 'http://worker.test',
    reviewed: true,
    httpClient: {
      get: async () => ({ data: {
        schema: 'myzubster-in-flight-operation-evidence/v1',
        status: 'maybe',
        redemptionId: 'RED-1'
      } })
    }
  });
  await assert.rejects(() => unknown.collect(report()), /unsupported status/);

  const mismatched = new MyzInFlightOperationEvidenceAdapter({
    baseUrl: 'http://worker.test',
    reviewed: true,
    httpClient: {
      get: async () => ({ data: {
        schema: 'myzubster-in-flight-operation-evidence/v1',
        status: 'running',
        redemptionId: 'RED-OTHER'
      } })
    }
  });
  await assert.rejects(() => mismatched.collect(report()), /does not match Marketplace record/);
});

test('in-flight evidence adapter refuses activation without explicit review', () => {
  assert.throws(
    () => new MyzInFlightOperationEvidenceAdapter({ baseUrl: 'http://worker.test' }),
    /explicitly reviewed/
  );
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const MyzProviderSettlementEvidenceAdapter = require('../services/myzProviderSettlementEvidenceAdapter');
const { findingPreview } = require('../services/myzReconciliationRepairPreviewService');

const NOW = new Date('2026-09-13T03:00:00.000Z').toISOString();

function report(overrides = {}) {
  return {
    redemption: {
      redemptionId: 'RED-1',
      quoteId: 'Q-1',
      provider: 'reviewed-provider',
      providerTransactionId: 'P-TX-1',
      expectedRecipientAmount: '2.5',
      toAsset: 'EUR',
      ...overrides
    },
    reservation: { redemptionId: 'RED-1', accountId: 'marketplace:user:alice' }
  };
}

function adapterWith(data) {
  return new MyzProviderSettlementEvidenceAdapter({
    baseUrl: 'https://evidence.test',
    apiKey: 'evidence-token',
    providerName: 'reviewed-provider',
    reviewed: true,
    httpClient: {
      get: async (url, options) => {
        assert.equal(url, 'https://evidence.test/settlements/lookup');
        assert.equal(options.headers.Authorization, 'Bearer evidence-token');
        return { data };
      }
    }
  });
}

test('provider evidence adapter verifies matching settled payout', async () => {
  const adapter = adapterWith({
    schema: 'myzubster-provider-settlement-evidence/v1',
    provider: 'reviewed-provider',
    status: 'settled',
    providerTransactionId: 'P-TX-1',
    recipientAmount: '2.5',
    toAsset: 'EUR',
    settledAt: NOW,
    evidenceReference: 'provider-proof-1'
  });
  const evidence = await adapter.collect(report());
  assert.equal(evidence.providerSettlementStatus.verified, true);
  assert.equal(evidence.providerSettlementStatus.status, 'settled');
  assert.equal(evidence.providerSettlementVerification.verified, true);
  assert.equal(evidence.providerSettlementVerification.amountMatches, true);
  assert.equal(evidence.providerSettlementVerification.assetMatches, true);
  assert.equal(evidence.providerSettlementVerification.transactionMatches, true);
});

test('provider evidence adapter keeps mismatched amount unverified', async () => {
  const adapter = adapterWith({
    schema: 'myzubster-provider-settlement-evidence/v1',
    provider: 'reviewed-provider',
    status: 'settled',
    providerTransactionId: 'P-TX-1',
    recipientAmount: '2.4',
    toAsset: 'EUR',
    settledAt: NOW
  });
  const evidence = await adapter.collect(report());
  assert.equal(evidence.providerSettlementStatus.verified, true);
  assert.equal(evidence.providerSettlementVerification.verified, false);
  assert.equal(evidence.providerSettlementVerification.amountMatches, false);
});

test('provider evidence adapter verifies not_found as status but never as settlement', async () => {
  const adapter = adapterWith({
    schema: 'myzubster-provider-settlement-evidence/v1',
    provider: 'reviewed-provider',
    status: 'not_found',
    evidenceRevision: 'rev-1'
  });
  const evidence = await adapter.collect(report({ providerTransactionId: null }));
  assert.equal(evidence.providerSettlementStatus.verified, true);
  assert.equal(evidence.providerSettlementStatus.status, 'not_found');
  assert.equal(evidence.providerSettlementVerification.verified, false);
  assert.equal(evidence.providerSettlementOrReversalStatus.verified, true);
});

test('provider evidence adapter refuses provider mismatch', async () => {
  const adapter = adapterWith({
    schema: 'myzubster-provider-settlement-evidence/v1',
    provider: 'reviewed-provider',
    status: 'not_found'
  });
  await assert.rejects(() => adapter.collect(report({ provider: 'other-provider' })), error => {
    assert.equal(error.code, 'MYZ_PROVIDER_EVIDENCE_PROVIDER_MISMATCH');
    return true;
  });
});

test('provider evidence adapter refuses activation without explicit review', () => {
  assert.throws(() => new MyzProviderSettlementEvidenceAdapter({
    baseUrl: 'https://evidence.test',
    providerName: 'reviewed-provider'
  }), /explicitly reviewed/);
});

test('repair preview blocks release when trusted provider evidence says settlement exists', () => {
  const finding = { code: 'STALE_RESERVATION', severity: 'medium' };
  const evidence = {
    providerSettlementStatus: { verified: true, source: 'provider', checkedAt: NOW, status: 'settled' },
    canonicalDebitStatus: { verified: true, source: 'ledger', checkedAt: NOW, status: 'not_found' },
    inFlightOperationStatus: { verified: true, source: 'worker', checkedAt: NOW, status: 'none' }
  };
  const preview = findingPreview(finding, evidence);
  assert.equal(preview.decision, 'WOULD_BLOCK');
  assert.equal(preview.missingEvidence.length, 0);
  assert.equal(preview.evidenceConflicts[0].key, 'providerSettlementStatus');
  assert.equal(preview.evidenceConflicts[0].status, 'settled');
});

test('settled-not-reconciled can reach review only with verified matching provider settlement', () => {
  const finding = { code: 'SETTLED_NOT_RECONCILED', severity: 'high' };
  const evidence = {
    providerSettlementVerification: { verified: true, source: 'provider', checkedAt: NOW, status: 'settled' },
    canonicalDebitStatus: { verified: true, source: 'ledger', checkedAt: NOW, status: 'not_found' }
  };
  const preview = findingPreview(finding, evidence);
  assert.equal(preview.decision, 'WOULD_ALLOW_REVIEW');
  assert.deepEqual(preview.evidenceConflicts, []);
});

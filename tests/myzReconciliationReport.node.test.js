'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyReconciliation, stateCounts } = require('../services/myzReconciliationReportService');
const { getRunbook, listRunbooks, attachRunbook } = require('../services/myzReconciliationRunbookService');
const { buildRepairPreview, findingPreview, isVerified } = require('../services/myzReconciliationRepairPreviewService');
const { safeEqual } = require('../middleware/myzReconciliationOperatorAuth');

const NOW = new Date('2026-09-13T03:00:00.000Z');

function redemption(overrides = {}) {
  return {
    redemptionId: 'RED-1',
    state: 'reconciled',
    createdAt: '2026-09-13T02:50:00.000Z',
    updatedAt: '2026-09-13T02:59:00.000Z',
    ...overrides
  };
}

function reservation(overrides = {}) {
  return {
    redemptionId: 'RED-1',
    reservationId: 'MYZR-1',
    state: 'committed',
    canonicalDebitEntryId: 'MYZ-LEDGER-DEBIT-1',
    createdAt: '2026-09-13T02:50:00.000Z',
    updatedAt: '2026-09-13T02:59:00.000Z',
    ...overrides
  };
}

test('healthy reconciled redemption is classified as ok', () => {
  const result = classifyReconciliation(redemption(), reservation(), { now: NOW, staleMinutes: 15 });
  assert.equal(result.severity, 'ok');
  assert.equal(result.requiresInvestigation, false);
  assert.deepEqual(result.findings, []);
});

test('settled redemption that exceeds threshold requires investigation and exposes fail-closed runbooks', () => {
  const result = classifyReconciliation(
    redemption({ state: 'settled', updatedAt: '2026-09-13T02:30:00.000Z' }),
    reservation({ state: 'reserved', canonicalDebitEntryId: null, updatedAt: '2026-09-13T02:30:00.000Z' }),
    { now: NOW, staleMinutes: 15 }
  );
  assert.equal(result.severity, 'high');
  assert.equal(result.requiresInvestigation, true);
  const settled = result.findings.find(item => item.code === 'SETTLED_NOT_RECONCILED');
  const stale = result.findings.find(item => item.code === 'STALE_RESERVATION');
  assert.ok(settled);
  assert.ok(stale);
  assert.equal(settled.runbook.automatedRepairAllowed, false);
  assert.equal(stale.runbook.automatedRepairAllowed, false);
  assert.ok(settled.runbook.never.some(rule => /Never release/.test(rule)));
});

test('rolled back redemption with unreleased reservation is high severity', () => {
  const result = classifyReconciliation(
    redemption({ state: 'rolled_back', failureCode: 'MYZ_REDEMPTION_RECONCILIATION_MISMATCH' }),
    reservation({ state: 'reserved', canonicalDebitEntryId: null }),
    { now: NOW, staleMinutes: 15 }
  );
  assert.equal(result.severity, 'high');
  const finding = result.findings.find(item => item.code === 'ROLLBACK_WITH_UNRELEASED_RESERVATION');
  assert.ok(finding);
  assert.equal(finding.runbook.automatedRepairAllowed, false);
});

test('committed canonical debit without reconciled redemption is high severity', () => {
  const result = classifyReconciliation(
    redemption({ state: 'failed', failureCode: 'MYZ_LEDGER_COMMIT_AMBIGUOUS' }),
    reservation(),
    { now: NOW, staleMinutes: 15 }
  );
  assert.equal(result.severity, 'high');
  const finding = result.findings.find(item => item.code === 'CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION');
  assert.ok(finding);
  assert.ok(finding.runbook.verify.some(step => /canonicalDebitEntryId/.test(step)));
});

test('orphan reservation is high severity', () => {
  const result = classifyReconciliation(null, reservation({ state: 'reserved' }), { now: NOW, staleMinutes: 15 });
  assert.equal(result.severity, 'high');
  assert.ok(result.findings.some(item => item.code === 'ORPHAN_RESERVATION'));
});

test('runbook catalog covers every current reconciliation finding code and never enables automated repair', () => {
  const expected = [
    'ORPHAN_RESERVATION',
    'REDEMPTION_FAILED',
    'SETTLED_NOT_RECONCILED',
    'REDEMPTION_ROLLED_BACK',
    'RESERVATION_FAILED',
    'STALE_RESERVATION',
    'COMMITTED_WITHOUT_CANONICAL_ENTRY',
    'RECONCILED_WITHOUT_COMMITTED_RESERVATION',
    'ROLLBACK_WITH_UNRELEASED_RESERVATION',
    'CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION'
  ];
  const catalog = listRunbooks();
  assert.deepEqual(catalog.map(item => item.code).sort(), expected.sort());
  assert.equal(catalog.every(item => item.automatedRepairAllowed === false), true);
  assert.equal(catalog.every(item => Array.isArray(item.verify) && item.verify.length > 0), true);
  assert.equal(catalog.every(item => Array.isArray(item.never) && item.never.length > 0), true);
});

test('unknown findings remain untouched and cannot accidentally inherit a repair policy', () => {
  const finding = { severity: 'high', code: 'UNKNOWN_FUTURE_FINDING', message: 'future' };
  assert.deepEqual(attachRunbook(finding), finding);
  assert.equal(getRunbook('UNKNOWN_FUTURE_FINDING'), null);
});

test('repair preview for healthy reconciliation proposes no mutation', () => {
  const report = {
    redemption: redemption(),
    reservation: reservation(),
    assessment: { severity: 'ok', findings: [] }
  };
  const preview = buildRepairPreview(report);
  assert.equal(preview.decision, 'WOULD_ALLOW_NO_ACTION');
  assert.equal(preview.proposedAction, 'NO_REPAIR_REQUIRED');
  assert.equal(preview.mutatesState, false);
  assert.equal(preview.automatedRepairAllowed, false);
});

test('repair preview blocks stale reservation without independent evidence', () => {
  const assessment = classifyReconciliation(
    redemption({ state: 'settlement_requested', updatedAt: '2026-09-13T02:30:00.000Z' }),
    reservation({ state: 'reserved', canonicalDebitEntryId: null, updatedAt: '2026-09-13T02:30:00.000Z' }),
    { now: NOW, staleMinutes: 15 }
  );
  const preview = buildRepairPreview({
    redemption: redemption({ state: 'settlement_requested' }),
    reservation: reservation({ state: 'reserved', canonicalDebitEntryId: null }),
    assessment
  });
  assert.equal(preview.decision, 'WOULD_BLOCK');
  assert.equal(preview.mutatesState, false);
  assert.ok(preview.missingEvidence.includes('providerSettlementStatus'));
  assert.ok(preview.missingEvidence.includes('canonicalDebitStatus'));
  assert.ok(preview.missingEvidence.includes('inFlightOperationStatus'));
});

test('repair preview only reaches WOULD_ALLOW_REVIEW with trusted, sourced, timestamped evidence', () => {
  const finding = { code: 'STALE_RESERVATION', severity: 'medium', message: 'stale' };
  const trustedEvidence = {
    providerSettlementStatus: { verified: true, source: 'provider-adapter', checkedAt: NOW.toISOString(), status: 'none' },
    canonicalDebitStatus: { verified: true, source: 'canonical-ledger-adapter', checkedAt: NOW.toISOString(), status: 'none' },
    inFlightOperationStatus: { verified: true, source: 'worker-registry', checkedAt: NOW.toISOString(), status: 'none' }
  };
  const preview = findingPreview(finding, trustedEvidence);
  assert.equal(preview.decision, 'WOULD_ALLOW_REVIEW');
  assert.equal(preview.automatedRepairAllowed, false);
  assert.deepEqual(preview.missingEvidence, []);
});

test('operator supplied booleans are not sufficient trusted evidence', () => {
  assert.equal(isVerified(true), false);
  assert.equal(isVerified({ verified: true }), false);
  assert.equal(isVerified({ verified: true, source: 'provider' }), false);
  assert.equal(isVerified({ verified: true, source: 'provider', checkedAt: NOW.toISOString() }), true);
});

test('unknown preview finding blocks rather than guessing an action', () => {
  const preview = findingPreview({ code: 'UNKNOWN_FUTURE_FINDING' }, {});
  assert.equal(preview.decision, 'WOULD_BLOCK');
  assert.equal(preview.proposedAction, 'MANUAL_INVESTIGATION');
  assert.deepEqual(preview.missingEvidence, ['reviewed_runbook']);
});

test('stateCounts returns deterministic per-state totals', () => {
  assert.deepEqual(stateCounts([{ state: 'reconciled' }, { state: 'failed' }, { state: 'reconciled' }]), {
    reconciled: 2,
    failed: 1
  });
});

test('operator token comparison is exact and timing-safe compatible', () => {
  assert.equal(safeEqual('operator-secret', 'operator-secret'), true);
  assert.equal(safeEqual('operator-secret', 'wrong-secret'), false);
  assert.equal(safeEqual('', ''), false);
});

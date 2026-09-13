'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyReconciliation, stateCounts } = require('../services/myzReconciliationReportService');
const { getRunbook, listRunbooks, attachRunbook } = require('../services/myzReconciliationRunbookService');
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

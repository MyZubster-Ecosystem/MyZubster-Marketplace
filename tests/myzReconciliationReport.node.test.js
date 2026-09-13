'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyReconciliation, stateCounts } = require('../services/myzReconciliationReportService');
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

test('settled redemption that exceeds threshold requires investigation', () => {
  const result = classifyReconciliation(
    redemption({ state: 'settled', updatedAt: '2026-09-13T02:30:00.000Z' }),
    reservation({ state: 'reserved', canonicalDebitEntryId: null, updatedAt: '2026-09-13T02:30:00.000Z' }),
    { now: NOW, staleMinutes: 15 }
  );
  assert.equal(result.severity, 'high');
  assert.equal(result.requiresInvestigation, true);
  assert.ok(result.findings.some(item => item.code === 'SETTLED_NOT_RECONCILED'));
  assert.ok(result.findings.some(item => item.code === 'STALE_RESERVATION'));
});

test('rolled back redemption with unreleased reservation is high severity', () => {
  const result = classifyReconciliation(
    redemption({ state: 'rolled_back', failureCode: 'MYZ_REDEMPTION_RECONCILIATION_MISMATCH' }),
    reservation({ state: 'reserved', canonicalDebitEntryId: null }),
    { now: NOW, staleMinutes: 15 }
  );
  assert.equal(result.severity, 'high');
  assert.ok(result.findings.some(item => item.code === 'ROLLBACK_WITH_UNRELEASED_RESERVATION'));
});

test('committed canonical debit without reconciled redemption is high severity', () => {
  const result = classifyReconciliation(
    redemption({ state: 'failed', failureCode: 'MYZ_LEDGER_COMMIT_AMBIGUOUS' }),
    reservation(),
    { now: NOW, staleMinutes: 15 }
  );
  assert.equal(result.severity, 'high');
  assert.ok(result.findings.some(item => item.code === 'CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION'));
});

test('orphan reservation is high severity', () => {
  const result = classifyReconciliation(null, reservation({ state: 'reserved' }), { now: NOW, staleMinutes: 15 });
  assert.equal(result.severity, 'high');
  assert.ok(result.findings.some(item => item.code === 'ORPHAN_RESERVATION'));
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

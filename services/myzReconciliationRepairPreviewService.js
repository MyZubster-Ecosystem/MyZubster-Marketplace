'use strict';

const { getRunbook } = require('./myzReconciliationRunbookService');

const ACTIONS = Object.freeze({
  ORPHAN_RESERVATION: 'REVIEW_RESERVATION_RELEASE',
  REDEMPTION_FAILED: 'CLASSIFY_FAILURE_STAGE',
  SETTLED_NOT_RECONCILED: 'RECONCILE_SETTLEMENT_AND_CANONICAL_DEBIT',
  REDEMPTION_ROLLED_BACK: 'CLOSE_INVESTIGATION_IF_REVERSALS_VERIFIED',
  RESERVATION_FAILED: 'RECONSTRUCT_STATE_FROM_EVIDENCE',
  STALE_RESERVATION: 'REVIEW_RESERVATION_RELEASE',
  COMMITTED_WITHOUT_CANONICAL_ENTRY: 'ATTACH_VERIFIED_CANONICAL_ENTRY_REFERENCE',
  RECONCILED_WITHOUT_COMMITTED_RESERVATION: 'REPAIR_LOCAL_RESERVATION_METADATA',
  ROLLBACK_WITH_UNRELEASED_RESERVATION: 'REVIEW_RESERVATION_RELEASE',
  CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION: 'REPAIR_LOCAL_RECONCILIATION_STATE'
});

const EVIDENCE_REQUIREMENTS = Object.freeze({
  ORPHAN_RESERVATION: ['providerSettlementStatus', 'canonicalDebitStatus', 'inFlightOperationStatus'],
  REDEMPTION_FAILED: ['providerSettlementStatus', 'canonicalDebitStatus'],
  SETTLED_NOT_RECONCILED: ['providerSettlementVerification', 'canonicalDebitStatus'],
  REDEMPTION_ROLLED_BACK: ['providerReversalStatus', 'canonicalDebitOrReversalStatus'],
  RESERVATION_FAILED: ['providerSettlementStatus', 'canonicalDebitStatus'],
  STALE_RESERVATION: ['providerSettlementStatus', 'canonicalDebitStatus', 'inFlightOperationStatus'],
  COMMITTED_WITHOUT_CANONICAL_ENTRY: ['canonicalDebitLookup'],
  RECONCILED_WITHOUT_COMMITTED_RESERVATION: ['providerSettlementVerification', 'canonicalDebitVerification'],
  ROLLBACK_WITH_UNRELEASED_RESERVATION: ['providerSettlementOrReversalStatus', 'canonicalDebitOrReversalStatus'],
  CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION: ['providerSettlementVerification', 'canonicalDebitVerification', 'postDebitReversalStatus']
});

function isVerified(value) {
  return value && typeof value === 'object' && value.verified === true && value.source && value.checkedAt;
}

function findingPreview(finding, trustedEvidence = {}) {
  const code = String(finding?.code || '').trim();
  const runbook = getRunbook(code);
  if (!runbook) {
    return {
      code,
      proposedAction: 'MANUAL_INVESTIGATION',
      decision: 'WOULD_BLOCK',
      automatedRepairAllowed: false,
      missingEvidence: ['reviewed_runbook'],
      reason: 'No reviewed repair runbook exists for this finding.'
    };
  }

  const requirements = EVIDENCE_REQUIREMENTS[code] || [];
  const missingEvidence = requirements.filter(key => !isVerified(trustedEvidence[key]));
  return {
    code,
    proposedAction: ACTIONS[code] || 'MANUAL_INVESTIGATION',
    decision: missingEvidence.length ? 'WOULD_BLOCK' : 'WOULD_ALLOW_REVIEW',
    automatedRepairAllowed: false,
    missingEvidence,
    preconditions: runbook.verify,
    prohibitedActions: runbook.never,
    reason: missingEvidence.length
      ? 'Independent evidence required by the runbook is missing or not freshly verified.'
      : 'Required evidence objects are present, but execution still requires a separately privileged reviewed repair command.'
  };
}

function buildRepairPreview(report, trustedEvidence = {}) {
  if (!report) {
    const error = new Error('Reconciliation report is required');
    error.code = 'INVALID_MYZ_REPAIR_PREVIEW_REQUEST';
    throw error;
  }

  const findings = Array.isArray(report.assessment?.findings) ? report.assessment.findings : [];
  if (findings.length === 0) {
    return {
      schema: 'myzubster-myz-repair-preview/v1',
      generatedAt: new Date().toISOString(),
      redemptionId: report.redemption?.redemptionId || report.reservation?.redemptionId || null,
      decision: 'WOULD_ALLOW_NO_ACTION',
      proposedAction: 'NO_REPAIR_REQUIRED',
      mutatesState: false,
      automatedRepairAllowed: false,
      missingEvidence: [],
      findings: [],
      note: 'Current Marketplace reconciliation state is internally consistent. No repair action is proposed.'
    };
  }

  const previews = findings.map(finding => findingPreview(finding, trustedEvidence));
  const missingEvidence = [...new Set(previews.flatMap(item => item.missingEvidence || []))];
  const blocked = previews.some(item => item.decision === 'WOULD_BLOCK');

  return {
    schema: 'myzubster-myz-repair-preview/v1',
    generatedAt: new Date().toISOString(),
    redemptionId: report.redemption?.redemptionId || report.reservation?.redemptionId || null,
    decision: blocked ? 'WOULD_BLOCK' : 'WOULD_ALLOW_REVIEW',
    proposedAction: previews.length === 1 ? previews[0].proposedAction : 'MULTI_FINDING_REVIEW',
    mutatesState: false,
    automatedRepairAllowed: false,
    missingEvidence,
    currentState: {
      redemption: report.redemption?.state || null,
      reservation: report.reservation?.state || null,
      canonicalDebitEntryId: report.reservation?.canonicalDebitEntryId || null,
      providerTransactionId: report.redemption?.providerTransactionId || null
    },
    findings: previews,
    note: blocked
      ? 'Preview is fail-closed. No mutation is available while required independent evidence is missing.'
      : 'Preview prerequisites appear satisfied by trusted evidence, but this endpoint still performs no mutation and grants no repair authority.'
  };
}

module.exports = { ACTIONS, EVIDENCE_REQUIREMENTS, isVerified, findingPreview, buildRepairPreview };

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

const SAFE_EVIDENCE_STATUS = Object.freeze({
  ORPHAN_RESERVATION: {
    providerSettlementStatus: ['not_found', 'none'],
    canonicalDebitStatus: ['not_found', 'none'],
    inFlightOperationStatus: ['none']
  },
  STALE_RESERVATION: {
    providerSettlementStatus: ['not_found', 'none'],
    canonicalDebitStatus: ['not_found', 'none'],
    inFlightOperationStatus: ['none']
  },
  REDEMPTION_ROLLED_BACK: {
    providerReversalStatus: ['reversed', 'refunded'],
    canonicalDebitOrReversalStatus: ['not_found', 'reversed']
  },
  ROLLBACK_WITH_UNRELEASED_RESERVATION: {
    providerSettlementOrReversalStatus: ['not_found', 'reversed', 'refunded'],
    canonicalDebitOrReversalStatus: ['not_found', 'reversed']
  },
  CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION: {
    providerSettlementVerification: ['settled'],
    canonicalDebitVerification: ['recorded'],
    postDebitReversalStatus: ['not_reversed']
  },
  SETTLED_NOT_RECONCILED: {
    providerSettlementVerification: ['settled']
  },
  RECONCILED_WITHOUT_COMMITTED_RESERVATION: {
    providerSettlementVerification: ['settled'],
    canonicalDebitVerification: ['recorded']
  },
  COMMITTED_WITHOUT_CANONICAL_ENTRY: {
    canonicalDebitLookup: ['recorded']
  }
});

function isVerified(value) {
  return value && typeof value === 'object' && value.verified === true && value.source && value.checkedAt;
}

function semanticEvidenceConflicts(code, trustedEvidence = {}) {
  const rules = SAFE_EVIDENCE_STATUS[code] || {};
  const conflicts = [];
  for (const [key, allowed] of Object.entries(rules)) {
    const value = trustedEvidence[key];
    if (!isVerified(value)) continue;
    const status = String(value.status || '').trim().toLowerCase();
    if (!allowed.includes(status)) conflicts.push({ key, status: status || 'unknown', allowed });
  }
  return conflicts;
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
      evidenceConflicts: [],
      reason: 'No reviewed repair runbook exists for this finding.'
    };
  }

  const requirements = EVIDENCE_REQUIREMENTS[code] || [];
  const missingEvidence = requirements.filter(key => !isVerified(trustedEvidence[key]));
  const evidenceConflicts = semanticEvidenceConflicts(code, trustedEvidence);
  const blocked = missingEvidence.length > 0 || evidenceConflicts.length > 0;

  return {
    code,
    proposedAction: ACTIONS[code] || 'MANUAL_INVESTIGATION',
    decision: blocked ? 'WOULD_BLOCK' : 'WOULD_ALLOW_REVIEW',
    automatedRepairAllowed: false,
    missingEvidence,
    evidenceConflicts,
    preconditions: runbook.verify,
    prohibitedActions: runbook.never,
    reason: missingEvidence.length
      ? 'Independent evidence required by the runbook is missing or not freshly verified.'
      : evidenceConflicts.length
        ? 'Trusted evidence is present but its verified state conflicts with the safety preconditions for the proposed repair.'
        : 'Required evidence is present and semantically compatible, but execution still requires a separately privileged reviewed repair command.'
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
      evidenceConflicts: [],
      findings: [],
      note: 'Current Marketplace reconciliation state is internally consistent. No repair action is proposed.'
    };
  }

  const previews = findings.map(finding => findingPreview(finding, trustedEvidence));
  const missingEvidence = [...new Set(previews.flatMap(item => item.missingEvidence || []))];
  const evidenceConflicts = previews.flatMap(item => (item.evidenceConflicts || []).map(conflict => ({ code: item.code, ...conflict })));
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
    evidenceConflicts,
    currentState: {
      redemption: report.redemption?.state || null,
      reservation: report.reservation?.state || null,
      canonicalDebitEntryId: report.reservation?.canonicalDebitEntryId || null,
      providerTransactionId: report.redemption?.providerTransactionId || null
    },
    findings: previews,
    note: blocked
      ? 'Preview is fail-closed. No mutation is available while required evidence is missing or conflicts with repair safety preconditions.'
      : 'Preview prerequisites appear satisfied by trusted evidence, but this endpoint still performs no mutation and grants no repair authority.'
  };
}

module.exports = {
  ACTIONS,
  EVIDENCE_REQUIREMENTS,
  SAFE_EVIDENCE_STATUS,
  isVerified,
  semanticEvidenceConflicts,
  findingPreview,
  buildRepairPreview
};

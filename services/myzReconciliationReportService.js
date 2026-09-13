'use strict';

const MyzRedemption = require('../models/MyzRedemption');
const MyzLedgerReservation = require('../models/MyzLedgerReservation');
const { attachRunbook } = require('./myzReconciliationRunbookService');

function ageMinutes(date, now = new Date()) {
  if (!date) return null;
  const value = new Date(date).getTime();
  if (Number.isNaN(value)) return null;
  return Math.max(0, Math.floor((now.getTime() - value) / 60000));
}

function classifyReconciliation(redemption, reservation, { staleMinutes = 15, now = new Date() } = {}) {
  const findings = [];
  const redemptionAge = ageMinutes(redemption?.updatedAt || redemption?.createdAt, now);
  const reservationAge = ageMinutes(reservation?.updatedAt || reservation?.createdAt, now);

  if (!redemption && reservation) findings.push({ severity: 'high', code: 'ORPHAN_RESERVATION', message: 'Reservation exists without a redemption record.' });
  if (redemption?.state === 'failed') findings.push({ severity: 'high', code: 'REDEMPTION_FAILED', message: redemption.failureCode || 'Redemption is in failed state.' });
  if (redemption?.state === 'settled' && redemptionAge !== null && redemptionAge >= staleMinutes) findings.push({ severity: 'high', code: 'SETTLED_NOT_RECONCILED', message: 'External settlement is recorded but canonical reconciliation has not completed.' });
  if (redemption?.state === 'rolled_back') findings.push({ severity: 'info', code: 'REDEMPTION_ROLLED_BACK', message: redemption.failureCode || 'Redemption rolled back.' });
  if (reservation?.state === 'failed') findings.push({ severity: 'high', code: 'RESERVATION_FAILED', message: reservation.failureCode || 'MYZ reservation is in failed state.' });
  if (reservation?.state === 'reserved' && reservationAge !== null && reservationAge >= staleMinutes) findings.push({ severity: 'medium', code: 'STALE_RESERVATION', message: 'MYZ credit remains reserved beyond the operator threshold.' });
  if (reservation?.state === 'committed' && !reservation.canonicalDebitEntryId) findings.push({ severity: 'high', code: 'COMMITTED_WITHOUT_CANONICAL_ENTRY', message: 'Reservation is committed without a canonical debit entry ID.' });
  if (redemption?.state === 'reconciled' && reservation?.state !== 'committed') findings.push({ severity: 'high', code: 'RECONCILED_WITHOUT_COMMITTED_RESERVATION', message: 'Redemption is reconciled but its MYZ reservation is not committed.' });
  if (redemption?.state === 'rolled_back' && reservation && reservation.state !== 'released') findings.push({ severity: 'high', code: 'ROLLBACK_WITH_UNRELEASED_RESERVATION', message: 'Redemption rolled back but reservation is not released.' });
  if (reservation?.state === 'committed' && redemption && redemption.state !== 'reconciled') findings.push({ severity: 'high', code: 'CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION', message: 'Canonical MYZ debit is committed but redemption is not reconciled.' });

  const highest = findings.some(item => item.severity === 'high')
    ? 'high'
    : findings.some(item => item.severity === 'medium')
      ? 'medium'
      : findings.some(item => item.severity === 'info')
        ? 'info'
        : 'ok';

  return {
    severity: highest,
    requiresInvestigation: ['high', 'medium'].includes(highest),
    findings: findings.map(attachRunbook),
    ageMinutes: { redemption: redemptionAge, reservation: reservationAge }
  };
}

function stateCounts(records = []) {
  return records.reduce((acc, record) => {
    const state = record?.state || 'unknown';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});
}

function operatorRedemptionView(redemption) {
  if (!redemption) return null;
  return {
    redemptionId: redemption.redemptionId,
    quoteId: redemption.quoteId,
    provider: redemption.provider,
    fromAmount: redemption.fromAmount,
    toAsset: redemption.toAsset,
    expectedRecipientAmount: redemption.expectedRecipientAmount,
    state: redemption.state,
    reservationId: redemption.reservationId || null,
    providerTransactionId: redemption.providerTransactionId || null,
    evidenceHash: redemption.evidenceHash || null,
    failureCode: redemption.failureCode || null,
    reconciliationNote: redemption.reconciliationNote || null,
    createdAt: redemption.createdAt,
    updatedAt: redemption.updatedAt
  };
}

function operatorReservationView(reservation) {
  if (!reservation) return null;
  return {
    reservationId: reservation.reservationId,
    redemptionId: reservation.redemptionId,
    accountId: reservation.accountId,
    amountMyz: reservation.amountMyz,
    state: reservation.state,
    canonicalBalanceAtReserve: reservation.canonicalBalanceAtReserve || null,
    canonicalLedgerRevision: reservation.canonicalLedgerRevision || null,
    canonicalDebitEntryId: reservation.canonicalDebitEntryId || null,
    releaseReason: reservation.releaseReason || null,
    failureCode: reservation.failureCode || null,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt
  };
}

class MyzReconciliationReportService {
  async buildReport(options = {}) {
    const limit = Math.min(Math.max(Number(options.limit || 100), 1), 500);
    const staleMinutes = Math.min(Math.max(Number(options.staleMinutes || 15), 1), 10080);
    const now = new Date();

    const [redemptions, reservations] = await Promise.all([
      MyzRedemption.find({}).sort({ updatedAt: -1 }).limit(limit).lean(),
      MyzLedgerReservation.find({}).sort({ updatedAt: -1 }).limit(limit).lean()
    ]);

    const reservationByRedemption = new Map(reservations.map(item => [item.redemptionId, item]));
    const redemptionIds = new Set(redemptions.map(item => item.redemptionId));
    const rows = [];

    for (const redemption of redemptions) {
      const reservation = reservationByRedemption.get(redemption.redemptionId) || null;
      const assessment = classifyReconciliation(redemption, reservation, { staleMinutes, now });
      rows.push({
        redemptionId: redemption.redemptionId,
        quoteId: redemption.quoteId,
        provider: redemption.provider,
        fromAmount: redemption.fromAmount,
        toAsset: redemption.toAsset,
        expectedRecipientAmount: redemption.expectedRecipientAmount,
        redemptionState: redemption.state,
        reservationState: reservation?.state || null,
        reservationId: reservation?.reservationId || redemption.reservationId || null,
        canonicalDebitEntryId: reservation?.canonicalDebitEntryId || null,
        providerTransactionId: redemption.providerTransactionId || null,
        failureCode: redemption.failureCode || reservation?.failureCode || null,
        reconciliationNote: redemption.reconciliationNote || null,
        createdAt: redemption.createdAt,
        updatedAt: redemption.updatedAt,
        assessment
      });
    }

    for (const reservation of reservations) {
      if (redemptionIds.has(reservation.redemptionId)) continue;
      const assessment = classifyReconciliation(null, reservation, { staleMinutes, now });
      rows.push({
        redemptionId: reservation.redemptionId,
        quoteId: null,
        provider: null,
        fromAmount: reservation.amountMyz,
        toAsset: null,
        expectedRecipientAmount: null,
        redemptionState: null,
        reservationState: reservation.state,
        reservationId: reservation.reservationId,
        canonicalDebitEntryId: reservation.canonicalDebitEntryId || null,
        providerTransactionId: null,
        failureCode: reservation.failureCode || null,
        reconciliationNote: null,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
        assessment
      });
    }

    rows.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    const investigation = rows.filter(row => row.assessment.requiresInvestigation);

    return {
      generatedAt: now.toISOString(),
      staleMinutes,
      limit,
      summary: {
        redemptions: stateCounts(redemptions),
        reservations: stateCounts(reservations),
        investigatedRows: rows.length,
        requiresInvestigation: investigation.length,
        highSeverity: rows.filter(row => row.assessment.severity === 'high').length,
        mediumSeverity: rows.filter(row => row.assessment.severity === 'medium').length,
        informational: rows.filter(row => row.assessment.severity === 'info').length
      },
      investigation,
      rows
    };
  }

  async getRedemptionReport(redemptionId, options = {}) {
    const normalized = String(redemptionId || '').trim();
    if (!normalized) {
      const error = new Error('redemptionId is required');
      error.code = 'INVALID_MYZ_RECONCILIATION_REPORT_REQUEST';
      throw error;
    }

    const [redemption, reservation] = await Promise.all([
      MyzRedemption.findOne({ redemptionId: normalized }).lean(),
      MyzLedgerReservation.findOne({ redemptionId: normalized }).lean()
    ]);
    if (!redemption && !reservation) return null;

    const staleMinutes = Math.min(Math.max(Number(options.staleMinutes || 15), 1), 10080);
    return {
      redemption: operatorRedemptionView(redemption),
      reservation: operatorReservationView(reservation),
      assessment: classifyReconciliation(redemption, reservation, { staleMinutes, now: new Date() })
    };
  }
}

module.exports = new MyzReconciliationReportService();
module.exports.MyzReconciliationReportService = MyzReconciliationReportService;
module.exports.classifyReconciliation = classifyReconciliation;
module.exports.stateCounts = stateCounts;
module.exports.operatorRedemptionView = operatorRedemptionView;
module.exports.operatorReservationView = operatorReservationView;

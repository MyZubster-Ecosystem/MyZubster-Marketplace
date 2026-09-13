const crypto = require('crypto');
const MyzRedemption = require('../models/MyzRedemption');
const myzAssetIdentityService = require('./myzAssetIdentityService');
const MyzInternalLedgerAdapter = require('./myzInternalLedgerAdapter');

const ALLOWED_TRANSITIONS = Object.freeze({
  quote_accepted: ['credit_reserved', 'failed'],
  credit_reserved: ['settlement_requested', 'rolled_back', 'failed'],
  settlement_requested: ['settled', 'rolled_back', 'failed'],
  settled: ['reconciled', 'rolled_back', 'failed'],
  reconciled: [],
  rolled_back: [],
  failed: []
});

class RedemptionProviderUnavailableError extends Error {
  constructor(message = 'No reviewed MYZ redemption provider is configured') {
    super(message);
    this.name = 'RedemptionProviderUnavailableError';
    this.code = 'MYZ_REDEMPTION_PROVIDER_UNAVAILABLE';
  }
}

class LedgerAdapterUnavailableError extends Error {
  constructor(message = 'No reviewed canonical MYZ ledger adapter is configured') {
    super(message);
    this.name = 'LedgerAdapterUnavailableError';
    this.code = 'MYZ_LEDGER_ADAPTER_UNAVAILABLE';
  }
}

class MyzRedemptionReconciliationService {
  constructor(options = {}) {
    this.providers = new Map();
    this.ledgerAdapter = options.ledgerAdapter || null;
    if (!options.skipEnvConfiguration) this.configureLedgerAdapterFromEnv();
  }

  configureLedgerAdapterFromEnv() {
    if (this.ledgerAdapter) return;
    if (process.env.MYZ_LEDGER_ADAPTER_ENABLED !== 'true') return;
    if (process.env.MYZ_LEDGER_ADAPTER_APPROVED !== 'true') return;
    if (!process.env.MYZ_LEDGER_API_URL) return;

    this.ledgerAdapter = new MyzInternalLedgerAdapter({
      baseUrl: process.env.MYZ_LEDGER_API_URL,
      apiKey: process.env.MYZ_LEDGER_API_KEY || null,
      reviewed: true,
      timeoutMs: process.env.MYZ_LEDGER_API_TIMEOUT_MS || 8000,
      accountPrefix: process.env.MYZ_LEDGER_ACCOUNT_PREFIX || 'marketplace:user:'
    });
  }

  registerLedgerAdapter(adapter) {
    const methods = ['reserveInternalCredit', 'commitInternalDebit', 'releaseReservation', 'getReservation'];
    const missing = methods.filter(method => !adapter || typeof adapter[method] !== 'function');
    if (missing.length) throw new TypeError(`MYZ ledger adapter is missing methods: ${missing.join(', ')}`);
    this.ledgerAdapter = adapter;
  }

  getLedgerAdapter() {
    return this.ledgerAdapter;
  }

  registerProvider(name, provider) {
    if (!name || typeof name !== 'string') throw new TypeError('Redemption provider name is required');
    const methods = [
      'getRedemptionQuote',
      'executeExternalSettlement',
      'reconcileSettlement',
      'validateQuote',
      'validateSettlementEvidence'
    ];
    const missing = methods.filter(method => !provider || typeof provider[method] !== 'function');
    if (missing.length) throw new TypeError(`Redemption provider is missing methods: ${missing.join(', ')}`);
    this.providers.set(name, provider);
  }

  listProviders() {
    return [...this.providers.keys()];
  }

  getProvider(name) {
    if (name) return this.providers.get(name) || null;
    return this.providers.values().next().value || null;
  }

  assertTransition(from, to) {
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      const error = new Error(`Invalid redemption transition: ${from} -> ${to}`);
      error.code = 'INVALID_MYZ_REDEMPTION_TRANSITION';
      throw error;
    }
    return true;
  }

  async transition(record, nextState, patch = {}) {
    this.assertTransition(record.state, nextState);
    Object.assign(record, patch, { state: nextState });
    await record.save();
    return record;
  }

  async start(input = {}, context = {}) {
    const identity = myzAssetIdentityService.assertReadyForExternalUse();
    if (identity.mode !== 'redemption_bridge') {
      const error = new Error('MYZ redemption workflow is available only in redemption_bridge mode');
      error.code = 'MYZ_REDEMPTION_MODE_REQUIRED';
      throw error;
    }

    const provider = this.getProvider(input.provider);
    if (!provider) throw new RedemptionProviderUnavailableError();
    const ledger = this.getLedgerAdapter();
    if (!ledger) throw new LedgerAdapterUnavailableError();

    const requestedBy = String(context.userId || '').trim();
    if (!requestedBy) {
      const error = new Error('Authenticated user is required');
      error.code = 'INVALID_MYZ_REDEMPTION_REQUEST';
      throw error;
    }

    const providerQuote = await provider.getRedemptionQuote({
      fromAsset: 'MYZ',
      fromAmount: input.fromAmount,
      toAsset: input.toAsset,
      requestedBy
    });
    const quote = provider.validateQuote(providerQuote);
    const redemptionId = `RED-${crypto.randomUUID()}`;
    const idempotencyKey = `myz-redemption-${quote.quoteId}-${requestedBy}`;

    let record;
    try {
      record = await MyzRedemption.create({
        redemptionId,
        requestedBy,
        quoteId: quote.quoteId,
        provider: quote.provider,
        fromAmount: quote.fromAmount,
        toAsset: quote.toAsset,
        expectedRecipientAmount: quote.grossRecipientAmount,
        state: 'quote_accepted',
        idempotencyKey
      });
    } catch (error) {
      if (error && error.code === 11000) {
        const existing = await MyzRedemption.findOne({ idempotencyKey }).lean();
        if (existing) return existing;
      }
      throw error;
    }

    let debitCommitAttempted = false;
    try {
      const reservation = await ledger.reserveInternalCredit({
        redemptionId,
        fromAmount: quote.fromAmount,
        requestedBy,
        idempotencyKey
      });
      if (!reservation || !reservation.reservationId || reservation.state !== 'reserved') {
        const error = new Error('Internal MYZ credit reservation was not confirmed');
        error.code = 'MYZ_CREDIT_RESERVATION_UNVERIFIED';
        throw error;
      }

      await this.transition(record, 'credit_reserved', { reservationId: String(reservation.reservationId) });
      await this.transition(record, 'settlement_requested');

      const rawSettlement = await provider.executeExternalSettlement({
        redemptionId,
        quoteId: quote.quoteId,
        reservationId: record.reservationId,
        toAsset: quote.toAsset,
        expectedRecipientAmount: quote.grossRecipientAmount,
        requestedBy,
        idempotencyKey
      });
      const settlement = provider.validateSettlementEvidence(rawSettlement);
      const evidenceHash = crypto.createHash('sha256')
        .update(JSON.stringify(settlement.evidence || {
          providerTransactionId: settlement.providerTransactionId,
          settledAt: settlement.settledAt,
          toAsset: settlement.toAsset,
          recipientAmount: settlement.recipientAmount
        }))
        .digest('hex');

      await this.transition(record, 'settled', {
        providerTransactionId: settlement.providerTransactionId,
        evidenceHash
      });

      const reconciliation = await provider.reconcileSettlement({
        redemptionId,
        quoteId: quote.quoteId,
        reservationId: record.reservationId,
        providerTransactionId: settlement.providerTransactionId,
        expectedRecipientAmount: quote.grossRecipientAmount,
        actualRecipientAmount: settlement.recipientAmount,
        toAsset: settlement.toAsset,
        requestedBy,
        idempotencyKey
      });

      if (!reconciliation || reconciliation.matched !== true || reconciliation.commitInternalDebit !== true) {
        await ledger.releaseReservation({
          redemptionId,
          reservationId: record.reservationId,
          requestedBy,
          reason: 'reconciliation_mismatch'
        });
        return this.transition(record, 'rolled_back', {
          failureCode: 'MYZ_REDEMPTION_RECONCILIATION_MISMATCH',
          reconciliationNote: String((reconciliation && reconciliation.reason) || 'External settlement did not match the redemption contract')
        });
      }

      debitCommitAttempted = true;
      const debit = await ledger.commitInternalDebit({
        redemptionId,
        reservationId: record.reservationId,
        requestedBy,
        providerTransactionId: settlement.providerTransactionId,
        evidenceHash,
        idempotencyKey
      });
      if (!debit || debit.state !== 'committed' || !debit.canonicalDebitEntryId) {
        const error = new Error('Canonical MYZ debit was not independently confirmed');
        error.code = 'MYZ_LEDGER_DEBIT_UNVERIFIED';
        throw error;
      }

      return this.transition(record, 'reconciled', {
        reconciliationNote: `External settlement matched and canonical MYZ debit ${debit.canonicalDebitEntryId} was recorded`
      });
    } catch (error) {
      if (record && record.state === 'settled' && debitCommitAttempted) {
        // Once a canonical debit request has been sent, a timeout/ambiguous response must
        // never restore the reserved credit automatically. Manual/core-ledger reconciliation
        // is required to avoid double-spend or double-credit outcomes.
        try {
          await this.transition(record, 'failed', {
            failureCode: error.code || 'MYZ_LEDGER_COMMIT_AMBIGUOUS',
            reconciliationNote: 'Canonical debit commit outcome is ambiguous; reservation was not released automatically'
          });
        } catch (_) {}
        throw error;
      }

      if (record && ['credit_reserved', 'settlement_requested'].includes(record.state) && record.reservationId) {
        try {
          await ledger.releaseReservation({
            redemptionId: record.redemptionId,
            reservationId: record.reservationId,
            requestedBy,
            reason: error.code || 'redemption_failure'
          });
          await this.transition(record, 'rolled_back', { failureCode: error.code || 'MYZ_REDEMPTION_FAILED' });
        } catch (_) {
          try {
            await this.transition(record, 'failed', {
              failureCode: error.code || 'MYZ_REDEMPTION_FAILED',
              reconciliationNote: 'Internal MYZ reservation release could not be verified'
            });
          } catch (_) {}
        }
      } else if (record && record.state === 'quote_accepted') {
        try {
          await this.transition(record, 'failed', { failureCode: error.code || 'MYZ_REDEMPTION_FAILED' });
        } catch (_) {}
      } else if (record && record.state === 'settled' && record.reservationId) {
        // Settlement is externally evidenced but no canonical debit has been attempted yet.
        // Release is only safe when provider reconciliation explicitly rejected the match;
        // generic failures here require manual investigation.
        try {
          await this.transition(record, 'failed', {
            failureCode: error.code || 'MYZ_REDEMPTION_POST_SETTLEMENT_FAILURE',
            reconciliationNote: 'External settlement exists; manual reconciliation required before changing internal credit'
          });
        } catch (_) {}
      }
      throw error;
    }
  }

  async getStatus(redemptionId, userId) {
    return MyzRedemption.findOne({ redemptionId, requestedBy: userId })
      .select('-_id redemptionId quoteId provider fromAmount toAsset expectedRecipientAmount state reservationId providerTransactionId evidenceHash failureCode reconciliationNote createdAt updatedAt')
      .lean();
  }
}

module.exports = new MyzRedemptionReconciliationService();
module.exports.MyzRedemptionReconciliationService = MyzRedemptionReconciliationService;
module.exports.RedemptionProviderUnavailableError = RedemptionProviderUnavailableError;
module.exports.LedgerAdapterUnavailableError = LedgerAdapterUnavailableError;
module.exports.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;

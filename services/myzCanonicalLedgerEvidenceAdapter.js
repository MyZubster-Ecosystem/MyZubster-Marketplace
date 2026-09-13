'use strict';

const axios = require('axios');

class MyzCanonicalLedgerEvidenceAdapter {
  constructor(options = {}) {
    this.baseUrl = String(options.baseUrl || '').replace(/\/$/, '');
    this.apiKey = options.apiKey || null;
    this.reviewed = options.reviewed === true;
    this.timeoutMs = Number(options.timeoutMs || 8000);
    this.httpClient = options.httpClient || axios;
    this.source = 'canonical-myz-ledger-api';
    if (!this.baseUrl) throw new TypeError('Canonical MYZ ledger evidence URL is required');
    if (!this.reviewed) {
      const error = new Error('Canonical MYZ ledger evidence adapter must be explicitly reviewed before use');
      error.code = 'MYZ_LEDGER_EVIDENCE_ADAPTER_NOT_REVIEWED';
      throw error;
    }
  }

  headers() {
    return {
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
    };
  }

  async lookup(report) {
    const redemption = report?.redemption || null;
    const reservation = report?.reservation || null;
    const accountId = String(reservation?.accountId || '').trim();
    const redemptionId = String(redemption?.redemptionId || reservation?.redemptionId || '').trim();
    const entryId = String(reservation?.canonicalDebitEntryId || '').trim();
    const providerTransactionId = String(redemption?.providerTransactionId || '').trim();
    if (!accountId || (!entryId && !redemptionId && !providerTransactionId)) {
      const error = new Error('Insufficient Marketplace references for canonical ledger evidence lookup');
      error.code = 'MYZ_LEDGER_EVIDENCE_REFERENCES_INCOMPLETE';
      throw error;
    }

    const response = await this.httpClient.get(`${this.baseUrl}/v1/myz/entries/lookup`, {
      headers: this.headers(),
      timeout: this.timeoutMs,
      params: {
        accountId,
        ...(entryId ? { entryId } : {}),
        ...(!entryId && redemptionId ? { redemptionId } : {}),
        ...(!entryId && providerTransactionId ? { providerTransactionId } : {})
      },
      validateStatus: status => status >= 200 && status < 300
    });
    const data = response.data && response.data.data ? response.data.data : response.data;
    if (!data || data.schema !== 'myzubster-myz-ledger-lookup/v1' || data.asset !== 'MYZ' || data.accountId !== accountId || !Array.isArray(data.entries)) {
      const error = new Error('Canonical MYZ ledger returned an invalid evidence response');
      error.code = 'INVALID_MYZ_LEDGER_EVIDENCE_RESPONSE';
      throw error;
    }
    return data;
  }

  evidenceObject(status, data, extra = {}, verified = true) {
    return {
      verified,
      source: this.source,
      checkedAt: new Date().toISOString(),
      status,
      ledgerRevision: data.revision || null,
      ...extra
    };
  }

  async collect(report) {
    const data = await this.lookup(report);
    const debit = data.entries.find(entry => entry?.entry_type === 'ADJUSTMENT_DEBIT' && entry?.status === 'RECORDED') || null;
    const status = !debit ? 'not_found' : debit.reversed ? 'reversed' : 'recorded';
    const details = debit ? {
      entryId: debit.entry_id,
      amountMyz: debit.amount_myz,
      reversed: debit.reversed === true,
      reversalEntryId: debit.reversalEntryId || null,
      redemptionId: debit.reference?.redemption_id || null,
      providerTransactionId: debit.reference?.provider_transaction_id || null
    } : { entryId: null, reversed: false, reversalEntryId: null };

    return {
      canonicalDebitStatus: this.evidenceObject(status, data, details, true),
      canonicalDebitOrReversalStatus: this.evidenceObject(status, data, details, true),
      canonicalDebitLookup: this.evidenceObject(status, data, details, Boolean(debit)),
      canonicalDebitVerification: this.evidenceObject(status, data, details, Boolean(debit && !debit.reversed)),
      postDebitReversalStatus: this.evidenceObject(debit?.reversed ? 'reversed' : 'not_reversed', data, details, Boolean(debit))
    };
  }
}

module.exports = MyzCanonicalLedgerEvidenceAdapter;

'use strict';

const axios = require('axios');

const ALLOWED_STATUSES = new Set(['not_found', 'pending', 'settled', 'failed', 'reversed', 'refunded']);

class MyzProviderSettlementEvidenceAdapter {
  constructor(options = {}) {
    this.baseUrl = String(options.baseUrl || '').replace(/\/$/, '');
    this.apiKey = options.apiKey || null;
    this.providerName = String(options.providerName || '').trim();
    this.reviewed = options.reviewed === true;
    this.timeoutMs = Number(options.timeoutMs || 8000);
    this.http = options.httpClient || axios;
    this.source = `provider-settlement-evidence:${this.providerName || 'unknown'}`;

    if (!this.baseUrl) throw new TypeError('Provider settlement evidence URL is required');
    if (!this.providerName) throw new TypeError('Provider settlement evidence provider name is required');
    if (!this.reviewed) {
      const error = new Error('Provider settlement evidence adapter must be explicitly reviewed before use');
      error.code = 'MYZ_PROVIDER_EVIDENCE_ADAPTER_NOT_REVIEWED';
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
    const reportProvider = String(redemption?.provider || '').trim();
    const redemptionId = String(redemption?.redemptionId || report?.reservation?.redemptionId || '').trim();
    const quoteId = String(redemption?.quoteId || '').trim();
    const providerTransactionId = String(redemption?.providerTransactionId || '').trim();

    if (reportProvider && reportProvider !== this.providerName) {
      const error = new Error('Configured provider evidence adapter does not match redemption provider');
      error.code = 'MYZ_PROVIDER_EVIDENCE_PROVIDER_MISMATCH';
      throw error;
    }
    if (!providerTransactionId && !redemptionId && !quoteId) {
      const error = new Error('Insufficient references for provider settlement evidence lookup');
      error.code = 'MYZ_PROVIDER_EVIDENCE_REFERENCES_INCOMPLETE';
      throw error;
    }

    const response = await this.http.get(`${this.baseUrl}/settlements/lookup`, {
      headers: this.headers(),
      timeout: this.timeoutMs,
      params: {
        provider: this.providerName,
        ...(providerTransactionId ? { providerTransactionId } : {}),
        ...(redemptionId ? { redemptionId } : {}),
        ...(quoteId ? { quoteId } : {})
      },
      validateStatus: status => status >= 200 && status < 300
    });

    const data = response?.data?.data || response?.data;
    if (!data || data.schema !== 'myzubster-provider-settlement-evidence/v1') {
      const error = new Error('Provider evidence endpoint returned an invalid schema');
      error.code = 'INVALID_MYZ_PROVIDER_EVIDENCE_RESPONSE';
      throw error;
    }
    if (String(data.provider || '').trim() !== this.providerName) {
      const error = new Error('Provider evidence response does not match configured provider');
      error.code = 'INVALID_MYZ_PROVIDER_EVIDENCE_RESPONSE';
      throw error;
    }

    const status = String(data.status || '').trim().toLowerCase();
    if (!ALLOWED_STATUSES.has(status)) {
      const error = new Error('Provider evidence response has an unsupported settlement status');
      error.code = 'INVALID_MYZ_PROVIDER_EVIDENCE_RESPONSE';
      throw error;
    }

    if (providerTransactionId && data.providerTransactionId && String(data.providerTransactionId) !== providerTransactionId) {
      const error = new Error('Provider evidence transaction ID does not match Marketplace record');
      error.code = 'MYZ_PROVIDER_EVIDENCE_TRANSACTION_MISMATCH';
      throw error;
    }

    return { ...data, status };
  }

  evidenceObject(status, data, extra = {}, verified = true) {
    return {
      verified,
      source: this.source,
      checkedAt: new Date().toISOString(),
      status,
      provider: this.providerName,
      evidenceRevision: data.evidenceRevision || null,
      ...extra
    };
  }

  async collect(report) {
    const data = await this.lookup(report);
    const redemption = report?.redemption || {};
    const status = data.status;
    const expectedAmount = String(redemption.expectedRecipientAmount || '').trim();
    const expectedAsset = String(redemption.toAsset || '').trim().toUpperCase();
    const actualAmount = data.recipientAmount == null ? null : String(data.recipientAmount);
    const actualAsset = data.toAsset == null ? null : String(data.toAsset).toUpperCase();
    const txId = data.providerTransactionId == null ? null : String(data.providerTransactionId);
    const marketplaceTxId = redemption.providerTransactionId == null ? null : String(redemption.providerTransactionId);

    const settled = status === 'settled';
    const reversed = status === 'reversed' || status === 'refunded';
    const amountMatches = settled && expectedAmount && actualAmount === expectedAmount;
    const assetMatches = settled && expectedAsset && actualAsset === expectedAsset;
    const transactionMatches = settled && (!marketplaceTxId || txId === marketplaceTxId);
    const settlementVerified = Boolean(settled && amountMatches && assetMatches && transactionMatches);

    const details = {
      providerTransactionId: txId,
      recipientAmount: actualAmount,
      toAsset: actualAsset,
      settledAt: data.settledAt || null,
      reversedAt: data.reversedAt || data.refundedAt || null,
      evidenceReference: data.evidenceReference || null,
      amountMatches,
      assetMatches,
      transactionMatches
    };

    return {
      providerSettlementStatus: this.evidenceObject(status, data, details, true),
      providerSettlementVerification: this.evidenceObject(status, data, details, settlementVerified),
      providerReversalStatus: this.evidenceObject(status, data, details, reversed),
      providerSettlementOrReversalStatus: this.evidenceObject(status, data, details, settled || reversed || status === 'not_found'),
      providerEvidenceRawStatus: this.evidenceObject(status, data, details, true)
    };
  }
}

module.exports = MyzProviderSettlementEvidenceAdapter;
module.exports.ALLOWED_STATUSES = ALLOWED_STATUSES;

class MyzRedemptionProviderContract {
  constructor(options = {}) {
    this.name = String(options.name || '').trim();
    this.reviewed = options.reviewed === true;

    if (!this.name) throw new TypeError('Redemption provider name is required');
    if (!this.reviewed) {
      const error = new Error('Redemption provider must be explicitly reviewed before use');
      error.code = 'MYZ_REDEMPTION_PROVIDER_NOT_REVIEWED';
      throw error;
    }
  }

  async getRedemptionQuote() {
    throw this.notImplemented('getRedemptionQuote');
  }

  async reserveInternalCredit() {
    throw this.notImplemented('reserveInternalCredit');
  }

  async executeExternalSettlement() {
    throw this.notImplemented('executeExternalSettlement');
  }

  async releaseReservation() {
    throw this.notImplemented('releaseReservation');
  }

  async reconcileSettlement() {
    throw this.notImplemented('reconcileSettlement');
  }

  notImplemented(method) {
    const error = new Error(`${method} must be implemented by the redemption provider adapter`);
    error.code = 'MYZ_REDEMPTION_PROVIDER_METHOD_NOT_IMPLEMENTED';
    return error;
  }

  validateQuote(quote) {
    const required = [
      'quoteId',
      'fromAmount',
      'toAsset',
      'grossRecipientAmount',
      'expiresAt',
      'priceMethodology'
    ];
    const missing = required.filter(key => quote == null || quote[key] == null || String(quote[key]).trim() === '');
    if (missing.length) {
      const error = new Error(`Redemption quote is missing required fields: ${missing.join(', ')}`);
      error.code = 'INVALID_MYZ_REDEMPTION_QUOTE';
      error.missing = missing;
      throw error;
    }

    const expiry = new Date(quote.expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
      const error = new Error('Redemption quote is expired or has invalid expiry');
      error.code = 'INVALID_MYZ_REDEMPTION_QUOTE';
      throw error;
    }

    return {
      quoteId: String(quote.quoteId),
      fromAsset: 'MYZ',
      fromAmount: String(quote.fromAmount),
      toAsset: String(quote.toAsset).toUpperCase(),
      grossRecipientAmount: String(quote.grossRecipientAmount),
      expiresAt: expiry.toISOString(),
      priceMethodology: String(quote.priceMethodology),
      provider: this.name,
      executable: false
    };
  }

  validateSettlementEvidence(result) {
    const required = ['providerTransactionId', 'settledAt', 'toAsset', 'recipientAmount'];
    const missing = required.filter(key => result == null || result[key] == null || String(result[key]).trim() === '');
    if (missing.length) {
      const error = new Error(`Settlement evidence is missing required fields: ${missing.join(', ')}`);
      error.code = 'UNVERIFIED_MYZ_REDEMPTION_SETTLEMENT';
      error.missing = missing;
      throw error;
    }

    const settledAt = new Date(result.settledAt);
    if (Number.isNaN(settledAt.getTime())) {
      const error = new Error('Settlement evidence has an invalid settledAt timestamp');
      error.code = 'UNVERIFIED_MYZ_REDEMPTION_SETTLEMENT';
      throw error;
    }

    return {
      providerTransactionId: String(result.providerTransactionId),
      settledAt: settledAt.toISOString(),
      toAsset: String(result.toAsset).toUpperCase(),
      recipientAmount: String(result.recipientAmount),
      evidence: result.evidence || null
    };
  }
}

module.exports = MyzRedemptionProviderContract;

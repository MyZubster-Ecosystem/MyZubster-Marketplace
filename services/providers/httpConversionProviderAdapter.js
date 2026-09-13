const axios = require('axios');

class HttpConversionProviderAdapter {
  constructor(options = {}) {
    this.name = options.name || 'external-provider';
    this.baseUrl = String(options.baseUrl || '').replace(/\/$/, '');
    this.apiKey = options.apiKey || null;
    this.timeoutMs = Number(options.timeoutMs || 8000);
    this.approved = options.approved === true;

    if (!this.baseUrl) throw new TypeError('Provider baseUrl is required');
    if (!this.approved) throw new Error('Provider must be explicitly approved before registration');
  }

  headers() {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }

  async getQuote(request) {
    const response = await axios.post(`${this.baseUrl}/quote`, {
      from: request.from,
      to: request.to,
      amount: request.amount,
      requestedBy: request.requestedBy || undefined
    }, {
      headers: this.headers(),
      timeout: this.timeoutMs,
      validateStatus: status => status >= 200 && status < 300
    });

    const data = response.data && response.data.data ? response.data.data : response.data;
    if (!data || data.executable !== true || !data.quoteId || !data.rate || !data.grossRecipientAmount || !data.expiresAt) {
      const error = new Error('Provider returned an invalid or non-executable quote');
      error.code = 'INVALID_PROVIDER_QUOTE';
      throw error;
    }

    return {
      quoteId: String(data.quoteId),
      rate: String(data.rate),
      providerFee: String(data.providerFee || '0'),
      grossRecipientAmount: String(data.grossRecipientAmount),
      expiresAt: String(data.expiresAt),
      provider: this.name,
      executable: true
    };
  }

  async executeQuote({ quoteId, requestedBy }) {
    const response = await axios.post(`${this.baseUrl}/execute`, {
      quoteId,
      requestedBy: requestedBy || undefined
    }, {
      headers: this.headers(),
      timeout: this.timeoutMs,
      validateStatus: status => status >= 200 && status < 300
    });

    const data = response.data && response.data.data ? response.data.data : response.data;
    if (!data || data.status !== 'settled' || !data.providerTransactionId || !data.settledAt) {
      const error = new Error('Provider did not return verifiable settlement evidence');
      error.code = 'UNVERIFIED_PROVIDER_SETTLEMENT';
      throw error;
    }

    return {
      status: 'settled',
      provider: this.name,
      providerTransactionId: String(data.providerTransactionId),
      settledAt: String(data.settledAt),
      evidence: data.evidence || null
    };
  }
}

module.exports = HttpConversionProviderAdapter;

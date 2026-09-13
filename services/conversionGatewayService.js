const crypto = require('crypto');

const SUPPORTED_ASSETS = Object.freeze(['MYZ', 'EUR', 'USDC', 'XMR']);

class ProviderUnavailableError extends Error {
  constructor(message = 'No authorized conversion provider is configured') {
    super(message);
    this.name = 'ProviderUnavailableError';
    this.code = 'CONVERSION_PROVIDER_UNAVAILABLE';
  }
}

class ConversionGatewayService {
  constructor() {
    this.providers = new Map();
  }

  listSupportedAssets() {
    return [...SUPPORTED_ASSETS];
  }

  registerProvider(name, provider) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('Provider name is required');
    }
    if (!provider || typeof provider.getQuote !== 'function') {
      throw new TypeError('Provider must implement getQuote(request)');
    }
    this.providers.set(name, provider);
  }

  getProvider(name) {
    if (name) return this.providers.get(name) || null;
    return this.providers.values().next().value || null;
  }

  validateQuoteRequest({ from, to, amount }) {
    const normalizedFrom = String(from || '').toUpperCase();
    const normalizedTo = String(to || '').toUpperCase();
    const normalizedAmount = String(amount || '').trim();

    if (!SUPPORTED_ASSETS.includes(normalizedFrom) || !SUPPORTED_ASSETS.includes(normalizedTo)) {
      const error = new Error('Unsupported conversion pair');
      error.code = 'UNSUPPORTED_CONVERSION_PAIR';
      throw error;
    }
    if (normalizedFrom === normalizedTo) {
      const error = new Error('Source and destination assets must differ');
      error.code = 'INVALID_CONVERSION_PAIR';
      throw error;
    }
    if (!/^\d+(?:\.\d{1,18})?$/.test(normalizedAmount) || Number(normalizedAmount) <= 0) {
      const error = new Error('Amount must be a positive decimal string with at most 18 fractional digits');
      error.code = 'INVALID_CONVERSION_AMOUNT';
      throw error;
    }

    return { from: normalizedFrom, to: normalizedTo, amount: normalizedAmount };
  }

  async createQuote(input, context = {}) {
    const request = this.validateQuoteRequest(input);
    const provider = this.getProvider(input.provider);
    if (!provider) throw new ProviderUnavailableError();

    const providerQuote = await provider.getQuote({
      ...request,
      requestedBy: context.userId || null
    });

    if (!providerQuote || providerQuote.executable !== true) {
      throw new ProviderUnavailableError('Configured provider did not return an executable quote');
    }

    return {
      quoteId: providerQuote.quoteId || `Q-${crypto.randomUUID()}`,
      from: request.from,
      to: request.to,
      amount: request.amount,
      rate: String(providerQuote.rate),
      providerFee: String(providerQuote.providerFee || '0'),
      myzubsterFee: String(providerQuote.myzubsterFee || '0'),
      recipientAmount: String(providerQuote.recipientAmount),
      expiresAt: providerQuote.expiresAt,
      provider: providerQuote.provider,
      executable: true,
      settlement: 'external_authorized_provider'
    };
  }

  async executeQuote() {
    const provider = this.getProvider();
    if (!provider || typeof provider.executeQuote !== 'function') {
      throw new ProviderUnavailableError('Execution is disabled until an authorized provider adapter is configured');
    }
    throw new ProviderUnavailableError('Execution adapter not enabled');
  }
}

module.exports = new ConversionGatewayService();
module.exports.ProviderUnavailableError = ProviderUnavailableError;
module.exports.SUPPORTED_ASSETS = SUPPORTED_ASSETS;

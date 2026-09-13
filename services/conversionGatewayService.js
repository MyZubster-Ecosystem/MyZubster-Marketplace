const crypto = require('crypto');
const ConversionAudit = require('../models/ConversionAudit');
const HttpConversionProviderAdapter = require('./providers/httpConversionProviderAdapter');
const { applyMyZubsterFee, normalizeDecimal } = require('./conversionFeeEngine');

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
    this.configureProviderFromEnv();
  }

  configureProviderFromEnv() {
    if (process.env.CONVERSION_PROVIDER_ENABLED !== 'true') return;
    if (process.env.CONVERSION_PROVIDER_APPROVED !== 'true') return;
    if (!process.env.CONVERSION_PROVIDER_URL) return;

    const name = process.env.CONVERSION_PROVIDER_NAME || 'external-provider';
    const provider = new HttpConversionProviderAdapter({
      name,
      baseUrl: process.env.CONVERSION_PROVIDER_URL,
      apiKey: process.env.CONVERSION_PROVIDER_API_KEY || null,
      timeoutMs: process.env.CONVERSION_PROVIDER_TIMEOUT_MS || 8000,
      approved: true
    });
    this.registerProvider(name, provider);
  }

  listSupportedAssets() {
    return [...SUPPORTED_ASSETS];
  }

  listProviders() {
    return [...this.providers.keys()];
  }

  registerProvider(name, provider) {
    if (!name || typeof name !== 'string') throw new TypeError('Provider name is required');
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
    const normalizedAmount = typeof amount === 'string' ? amount.trim() : '';

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

    const providerQuote = await provider.getQuote({ ...request, requestedBy: context.userId || null });
    if (!providerQuote || providerQuote.executable !== true) {
      throw new ProviderUnavailableError('Configured provider did not return an executable quote');
    }

    const providerFee = normalizeDecimal(providerQuote.providerFee || '0');
    const fees = applyMyZubsterFee(
      normalizeDecimal(providerQuote.grossRecipientAmount),
      Number(process.env.MYZ_CONVERSION_FEE_BPS || 100)
    );

    const quote = {
      quoteId: String(providerQuote.quoteId || `Q-${crypto.randomUUID()}`),
      from: request.from,
      to: request.to,
      amount: request.amount,
      rate: normalizeDecimal(providerQuote.rate),
      grossRecipientAmount: fees.grossRecipientAmount,
      providerFee,
      myzubsterFee: fees.myzubsterFee,
      recipientAmount: fees.recipientAmount,
      feeBasisPoints: fees.feeBasisPoints,
      expiresAt: String(providerQuote.expiresAt),
      provider: String(providerQuote.provider || input.provider || 'external-provider'),
      executable: true,
      settlement: 'external_authorized_provider'
    };

    try {
      await ConversionAudit.create({
        quoteId: quote.quoteId,
        requestedBy: context.userId,
        event: 'quote_issued',
        provider: quote.provider,
        from: quote.from,
        to: quote.to,
        amount: quote.amount,
        grossRecipientAmount: quote.grossRecipientAmount,
        providerFee: quote.providerFee,
        myzubsterFee: quote.myzubsterFee,
        recipientAmount: quote.recipientAmount,
        feeBasisPoints: quote.feeBasisPoints
      });
    } catch (error) {
      const auditError = new Error('Quote audit storage unavailable');
      auditError.code = 'CONVERSION_AUDIT_UNAVAILABLE';
      throw auditError;
    }

    return quote;
  }

  async executeQuote(input, context = {}) {
    const quoteId = String(input.quoteId || '').trim();
    if (!quoteId) {
      const error = new Error('quoteId is required');
      error.code = 'INVALID_CONVERSION_REQUEST';
      throw error;
    }

    const issued = await ConversionAudit.findOne({
      quoteId,
      requestedBy: context.userId,
      event: 'quote_issued'
    }).sort({ createdAt: -1 }).lean();

    if (!issued) {
      const error = new Error('Quote not found for authenticated user');
      error.code = 'CONVERSION_QUOTE_NOT_FOUND';
      throw error;
    }

    const alreadySettled = await ConversionAudit.exists({ quoteId, requestedBy: context.userId, event: 'settled' });
    if (alreadySettled) {
      const error = new Error('Quote has already been settled');
      error.code = 'CONVERSION_ALREADY_SETTLED';
      throw error;
    }

    const provider = this.getProvider(issued.provider);
    if (!provider || typeof provider.executeQuote !== 'function') {
      throw new ProviderUnavailableError('Execution is disabled until an authorized provider adapter is configured');
    }

    await ConversionAudit.create({
      quoteId,
      requestedBy: context.userId,
      event: 'execution_requested',
      provider: issued.provider
    });

    try {
      const result = await provider.executeQuote({ quoteId, requestedBy: context.userId });
      if (!result || result.status !== 'settled' || !result.providerTransactionId) {
        const error = new Error('Provider settlement could not be verified');
        error.code = 'UNVERIFIED_PROVIDER_SETTLEMENT';
        throw error;
      }

      const evidenceHash = crypto.createHash('sha256')
        .update(JSON.stringify(result.evidence || { providerTransactionId: result.providerTransactionId, settledAt: result.settledAt }))
        .digest('hex');

      await ConversionAudit.create({
        quoteId,
        requestedBy: context.userId,
        event: 'settled',
        provider: issued.provider,
        providerTransactionId: result.providerTransactionId,
        evidenceHash
      });

      return {
        quoteId,
        status: 'settled',
        provider: issued.provider,
        providerTransactionId: result.providerTransactionId,
        settledAt: result.settledAt,
        evidenceHash
      };
    } catch (error) {
      try {
        await ConversionAudit.create({
          quoteId,
          requestedBy: context.userId,
          event: 'execution_failed',
          provider: issued.provider,
          errorCode: error.code || 'PROVIDER_EXECUTION_FAILED'
        });
      } catch (_) {
        // Preserve the original provider failure; audit storage is already fail-closed on quote issuance.
      }
      throw error;
    }
  }

  async getAuditTrail(quoteId, userId) {
    const normalizedQuoteId = String(quoteId || '').trim();
    if (!normalizedQuoteId) {
      const error = new Error('quoteId is required');
      error.code = 'INVALID_CONVERSION_REQUEST';
      throw error;
    }

    return ConversionAudit.find({ quoteId: normalizedQuoteId, requestedBy: userId })
      .sort({ createdAt: 1 })
      .select('-_id quoteId event provider from to amount grossRecipientAmount providerFee myzubsterFee recipientAmount feeBasisPoints providerTransactionId evidenceHash errorCode createdAt')
      .lean();
  }
}

module.exports = new ConversionGatewayService();
module.exports.ProviderUnavailableError = ProviderUnavailableError;
module.exports.SUPPORTED_ASSETS = SUPPORTED_ASSETS;

const crypto = require('crypto');
const PaymentIntent = require('../models/PaymentIntent');

class FiatPaymentService {
  constructor() {
    this.rates = {
      EUR: 1,
      USD: 1.08,
      GBP: 0.85
    };
  }

  buildPaymentIntent(data, userId) {
    return {
      id: `FIAT-${crypto.randomUUID()}`,
      rail: 'fiat',
      amount: data.amount,
      currency: data.currency,
      recipient: data.recipient,
      requestedBy: userId,
      method: 'external_provider_required',
      status: 'awaiting_external_payment',
      verificationStatus: 'unverified',
      createdAt: new Date().toISOString()
    };
  }

  async createPaymentIntent(data, userId) {
    const intent = this.buildPaymentIntent(data, userId);
    const stored = await PaymentIntent.create({
      intentId: intent.id,
      rail: intent.rail,
      requestedBy: intent.requestedBy,
      amount: intent.amount,
      currency: intent.currency,
      recipient: intent.recipient,
      method: intent.method,
      status: intent.status,
      verificationStatus: intent.verificationStatus
    });
    return {
      id: stored.intentId,
      rail: stored.rail,
      amount: stored.amount,
      currency: stored.currency,
      recipient: stored.recipient,
      requestedBy: stored.requestedBy,
      method: stored.method,
      status: stored.status,
      verificationStatus: stored.verificationStatus,
      createdAt: stored.createdAt.toISOString()
    };
  }

  convert(amount, from, to) {
    const eurAmount = amount / this.rates[from];
    return eurAmount * this.rates[to];
  }

  async getStats(userId) {
    const [total, awaitingExternalPayment, verified] = await Promise.all([
      PaymentIntent.countDocuments({ requestedBy: userId, rail: 'fiat' }),
      PaymentIntent.countDocuments({ requestedBy: userId, rail: 'fiat', status: 'awaiting_external_payment' }),
      PaymentIntent.countDocuments({ requestedBy: userId, rail: 'fiat', verificationStatus: 'verified' })
    ]);
    return {
      total,
      awaitingExternalPayment,
      verified
    };
  }
}

module.exports = new FiatPaymentService();

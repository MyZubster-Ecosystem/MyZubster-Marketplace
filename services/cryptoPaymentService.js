const crypto = require('crypto');
const PaymentIntent = require('../models/PaymentIntent');

class CryptoPaymentService {
  constructor() {
    this.rates = {
      BTC: 60000,
      ETH: 3000,
      ADA: 0.4,
      XMR: 180,
      MYZ: 0.0001
    };
  }

  buildPaymentIntent(data, userId) {
    return {
      id: `PAY-${crypto.randomUUID()}`,
      rail: 'crypto',
      amount: data.amount,
      currency: data.currency,
      recipient: data.recipient,
      requestedBy: userId,
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
      status: stored.status,
      verificationStatus: stored.verificationStatus,
      createdAt: stored.createdAt.toISOString()
    };
  }

  // Converti valuta
  convert(amount, from, to) {
    const usdAmount = amount * this.rates[from];
    return usdAmount / this.rates[to];
  }

  async getStats(userId) {
    const [total, awaitingExternalPayment, verified] = await Promise.all([
      PaymentIntent.countDocuments({ requestedBy: userId, rail: 'crypto' }),
      PaymentIntent.countDocuments({ requestedBy: userId, rail: 'crypto', status: 'awaiting_external_payment' }),
      PaymentIntent.countDocuments({ requestedBy: userId, rail: 'crypto', verificationStatus: 'verified' })
    ]);
    return {
      total,
      awaitingExternalPayment,
      verified
    };
  }
}

module.exports = new CryptoPaymentService();

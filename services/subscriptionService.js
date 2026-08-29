const crypto = require('crypto');
const PaymentSubscription = require('../models/PaymentSubscription');

function plain(document) {
  return typeof document?.toObject === 'function' ? document.toObject() : document;
}

class SubscriptionService {
  constructor(model = PaymentSubscription) {
    this.model = model;
  }

  calculateNextPayment(interval, from = new Date()) {
    const next = new Date(from);
    switch (interval) {
      case 'daily': next.setUTCDate(next.getUTCDate() + 1); break;
      case 'weekly': next.setUTCDate(next.getUTCDate() + 7); break;
      case 'monthly': next.setUTCMonth(next.getUTCMonth() + 1); break;
      case 'yearly': next.setUTCFullYear(next.getUTCFullYear() + 1); break;
      default: throw new Error('Unsupported subscription interval');
    }
    return next;
  }

  presentSubscription(document) {
    const subscription = plain(document);
    return {
      id: subscription.subscriptionId,
      name: subscription.name,
      amount: subscription.amount,
      currency: subscription.currency,
      interval: subscription.interval,
      nextPayment: subscription.nextPayment,
      status: subscription.status,
      verificationStatus: subscription.verificationStatus,
      subscriber: subscription.subscriber,
      createdAt: subscription.createdAt
    };
  }

  async createSubscription(data, userId) {
    const subscription = await this.model.create({
      subscriptionId: `SUB-${crypto.randomUUID()}`,
      requestedBy: userId,
      name: data.name || 'Subscription',
      amount: data.amount,
      currency: data.currency,
      interval: data.interval,
      nextPayment: this.calculateNextPayment(data.interval),
      status: 'awaiting_external_payment',
      verificationStatus: 'unverified',
      subscriber: data.subscriber
    });
    return this.presentSubscription(subscription);
  }

  processRenewals() {
    const error = new Error('Independent settlement provider is not configured');
    error.code = 'SETTLEMENT_PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  async getStats(userId) {
    const subscriptions = (await this.model.find({ requestedBy: userId })).map(plain);
    return {
      total: subscriptions.length,
      active: subscriptions.filter(subscription => subscription.status === 'active').length,
      awaitingExternalPayment: subscriptions.filter(
        subscription => subscription.status === 'awaiting_external_payment'
      ).length,
      byInterval: {
        daily: subscriptions.filter(subscription => subscription.interval === 'daily').length,
        weekly: subscriptions.filter(subscription => subscription.interval === 'weekly').length,
        monthly: subscriptions.filter(subscription => subscription.interval === 'monthly').length,
        yearly: subscriptions.filter(subscription => subscription.interval === 'yearly').length
      }
    };
  }

  setModelForTests(model) {
    if (process.env.NODE_ENV !== 'test') throw new Error('Model override is only available in tests');
    this.model = model || PaymentSubscription;
  }
}

const service = new SubscriptionService();
module.exports = service;
module.exports.SubscriptionService = SubscriptionService;

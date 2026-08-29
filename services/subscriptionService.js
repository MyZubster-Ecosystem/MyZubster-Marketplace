const crypto = require('crypto');

class SubscriptionService {
  constructor() {
    this.subscriptions = [];
  }

  // Crea abbonamento
  createSubscription(data) {
    const subscription = {
      id: `SUB-${crypto.randomUUID()}`,
      name: data.name || 'Subscription',
      amount: data.amount,
      currency: data.currency,
      interval: data.interval || 'monthly',
      nextPayment: this.calculateNextPayment(data.interval),
      status: 'awaiting_external_payment',
      verificationStatus: 'unverified',
      subscriber: data.subscriber,
      createdAt: new Date()
    };
    this.subscriptions.push(subscription);
    return subscription;
  }

  // Calcola prossimo pagamento
  calculateNextPayment(interval) {
    const now = new Date();
    switch(interval) {
      case 'daily': return new Date(now.setDate(now.getDate() + 1));
      case 'weekly': return new Date(now.setDate(now.getDate() + 7));
      case 'monthly': return new Date(now.setMonth(now.getMonth() + 1));
      case 'yearly': return new Date(now.setFullYear(now.getFullYear() + 1));
      default: return new Date(now.setMonth(now.getMonth() + 1));
    }
  }

  // Processa rinnovi
  processRenewals() {
    const error = new Error('Independent settlement provider is not configured');
    error.code = 'SETTLEMENT_PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  getStats() {
    return {
      total: this.subscriptions.length,
      active: this.subscriptions.filter(s => s.status === 'active').length,
      awaitingExternalPayment: this.subscriptions.filter(s => s.status === 'awaiting_external_payment').length,
      byInterval: {
        daily: this.subscriptions.filter(s => s.interval === 'daily').length,
        weekly: this.subscriptions.filter(s => s.interval === 'weekly').length,
        monthly: this.subscriptions.filter(s => s.interval === 'monthly').length,
        yearly: this.subscriptions.filter(s => s.interval === 'yearly').length
      }
    };
  }

  resetForTests() {
    if (process.env.NODE_ENV === 'test') this.subscriptions = [];
  }
}

module.exports = new SubscriptionService();

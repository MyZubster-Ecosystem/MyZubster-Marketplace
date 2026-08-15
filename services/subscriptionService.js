class SubscriptionService {
  constructor() {
    this.subscriptions = [];
  }

  // Crea abbonamento
  createSubscription(data) {
    const subscription = {
      id: `SUB-${Date.now()}`,
      name: data.name || 'Subscription',
      amount: data.amount || 0.01,
      currency: data.currency || 'XMR',
      interval: data.interval || 'monthly',
      nextPayment: this.calculateNextPayment(data.interval),
      status: 'active',
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
    const now = new Date();
    let processed = 0;
    
    this.subscriptions.forEach(sub => {
      if (sub.status === 'active' && new Date(sub.nextPayment) <= now) {
        sub.lastPayment = new Date();
        sub.nextPayment = this.calculateNextPayment(sub.interval);
        processed++;
      }
    });
    
    return processed;
  }

  getStats() {
    return {
      total: this.subscriptions.length,
      active: this.subscriptions.filter(s => s.status === 'active').length,
      byInterval: {
        daily: this.subscriptions.filter(s => s.interval === 'daily').length,
        weekly: this.subscriptions.filter(s => s.interval === 'weekly').length,
        monthly: this.subscriptions.filter(s => s.interval === 'monthly').length,
        yearly: this.subscriptions.filter(s => s.interval === 'yearly').length
      }
    };
  }
}

module.exports = new SubscriptionService();

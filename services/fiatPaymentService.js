class FiatPaymentService {
  constructor() {
    this.payments = [];
    this.rates = {
      EUR: 1,
      USD: 1.08,
      GBP: 0.85
    };
  }

  createPayment(data) {
    const payment = {
      id: `FIAT-${Date.now()}`,
      amount: data.amount,
      currency: data.currency || 'EUR',
      recipient: data.recipient,
      method: data.method || 'bank_transfer',
      status: 'pending',
      createdAt: new Date()
    };
    this.payments.push(payment);
    return payment;
  }

  convert(amount, from, to) {
    const eurAmount = amount / this.rates[from];
    return eurAmount * this.rates[to];
  }

  getStats() {
    return {
      total: this.payments.length,
      pending: this.payments.filter(p => p.status === 'pending').length,
      byCurrency: {
        EUR: this.payments.filter(p => p.currency === 'EUR').length,
        USD: this.payments.filter(p => p.currency === 'USD').length,
        GBP: this.payments.filter(p => p.currency === 'GBP').length
      }
    };
  }
}

module.exports = new FiatPaymentService();

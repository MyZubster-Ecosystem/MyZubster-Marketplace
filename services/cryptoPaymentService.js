class CryptoPaymentService {
  constructor() {
    this.transactions = [];
    this.rates = {
      BTC: 60000,
      ETH: 3000,
      ADA: 0.4,
      XMR: 180,
      MYZ: 0.0001
    };
  }

  // Crea pagamento
  createPayment(data) {
    const payment = {
      id: `PAY-${Date.now()}`,
      amount: data.amount,
      currency: data.currency || 'XMR',
      recipient: data.recipient,
      status: 'pending',
      txId: `tx_${Date.now()}`,
      createdAt: new Date()
    };
    this.transactions.push(payment);
    return payment;
  }

  // Converti valuta
  convert(amount, from, to) {
    const usdAmount = amount * this.rates[from];
    return usdAmount / this.rates[to];
  }

  getStats() {
    return {
      total: this.transactions.length,
      pending: this.transactions.filter(t => t.status === 'pending').length,
      completed: this.transactions.filter(t => t.status === 'completed').length
    };
  }
}

module.exports = new CryptoPaymentService();

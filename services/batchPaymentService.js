const crypto = require('crypto');

class BatchPaymentService {
  constructor() {
    this.batches = [];
    this.payments = [];
  }

  // Crea batch di pagamenti
  createBatch(data) {
    const batch = {
      id: `BATCH-${crypto.randomUUID()}`,
      name: data.name || 'Batch Payment',
      payments: [],
      status: 'draft',
      totalAmount: 0,
      createdAt: new Date()
    };

    this.batches.push(batch);

    // Aggiungi pagamenti al batch
    if (data.payments && data.payments.length > 0) {
      data.payments.forEach(p => {
        this.addPaymentToBatch(batch.id, p);
      });
    }

    return batch;
  }

  // Aggiungi pagamento a batch
  addPaymentToBatch(batchId, data) {
    const batch = this.batches.find(item => item.id === batchId);
    if (!batch) throw new Error('Batch not found');

    const payment = {
      id: `PAY-${crypto.randomUUID()}`,
      batchId,
      recipient: data.recipient,
      amount: data.amount,
      currency: data.currency,
      status: 'draft',
      verificationStatus: 'unverified',
      createdAt: new Date()
    };
    this.payments.push(payment);
    batch.payments.push(payment.id);
    batch.totalAmount += payment.amount;
    return payment;
  }

  // Esegui batch
  executeBatch(batchId) {
    const batch = this.batches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');

    const error = new Error('Independent settlement provider is not configured');
    error.code = 'SETTLEMENT_PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  getStats() {
    return {
      totalBatches: this.batches.length,
      draft: this.batches.filter(b => b.status === 'draft').length,
      completed: this.batches.filter(b => b.status === 'completed').length,
      totalPayments: this.payments.length
    };
  }

  resetForTests() {
    if (process.env.NODE_ENV === 'test') {
      this.batches = [];
      this.payments = [];
    }
  }
}

module.exports = new BatchPaymentService();

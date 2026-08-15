class BatchPaymentService {
  constructor() {
    this.batches = [];
    this.payments = [];
  }

  // Crea batch di pagamenti
  createBatch(data) {
    const batch = {
      id: `BATCH-${Date.now()}`,
      name: data.name || 'Batch Payment',
      payments: [],
      status: 'pending',
      totalAmount: 0,
      createdAt: new Date()
    };

    // Aggiungi pagamenti al batch
    if (data.payments && data.payments.length > 0) {
      data.payments.forEach(p => {
        const payment = this.addPaymentToBatch(batch.id, p);
        batch.totalAmount += payment.amount;
      });
    }

    this.batches.push(batch);
    return batch;
  }

  // Aggiungi pagamento a batch
  addPaymentToBatch(batchId, data) {
    const payment = {
      id: `PAY-${Date.now()}`,
      batchId,
      recipient: data.recipient,
      amount: data.amount || 0.01,
      currency: data.currency || 'XMR',
      status: 'pending',
      createdAt: new Date()
    };
    this.payments.push(payment);
    return payment;
  }

  // Esegui batch
  executeBatch(batchId) {
    const batch = this.batches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    
    batch.status = 'processing';
    const batchPayments = this.payments.filter(p => p.batchId === batchId);
    
    batchPayments.forEach(p => {
      p.status = 'completed';
    });
    
    batch.status = 'completed';
    batch.completedAt = new Date();
    return batch;
  }

  getStats() {
    return {
      totalBatches: this.batches.length,
      pending: this.batches.filter(b => b.status === 'pending').length,
      completed: this.batches.filter(b => b.status === 'completed').length,
      totalPayments: this.payments.length
    };
  }
}

module.exports = new BatchPaymentService();

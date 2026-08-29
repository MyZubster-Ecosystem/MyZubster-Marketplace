const crypto = require('crypto');
const PaymentBatch = require('../models/PaymentBatch');
const { addDecimalAmounts } = require('../middleware/paymentValidation');

function plain(document) {
  return typeof document?.toObject === 'function' ? document.toObject() : document;
}

function notFoundError() {
  const error = new Error('Batch not found');
  error.code = 'BATCH_NOT_FOUND';
  return error;
}

class BatchPaymentService {
  constructor(model = PaymentBatch) {
    this.model = model;
  }

  buildPayment(data) {
    return {
      paymentId: `PAY-${crypto.randomUUID()}`,
      recipient: data.recipient,
      amount: data.amount,
      currency: data.currency,
      status: 'draft',
      verificationStatus: 'unverified',
      createdAt: new Date()
    };
  }

  presentBatch(document) {
    const batch = plain(document);
    const payments = (batch.payments || []).map(plain);
    return {
      id: batch.batchId,
      name: batch.name,
      status: batch.status,
      totalAmount: payments.length ? addDecimalAmounts(payments.map(payment => payment.amount)) : '0',
      payments: payments.map(payment => payment.paymentId),
      createdAt: batch.createdAt
    };
  }

  async createBatch(data, userId) {
    const payments = (data.payments || []).map(payment => this.buildPayment(payment));
    const batch = await this.model.create({
      batchId: `BATCH-${crypto.randomUUID()}`,
      requestedBy: userId,
      name: data.name || 'Batch Payment',
      status: 'draft',
      payments
    });
    return this.presentBatch(batch);
  }

  async addPaymentToBatch(batchId, data, userId) {
    const payment = this.buildPayment(data);
    const batch = await this.model.findOneAndUpdate(
      { batchId, requestedBy: userId, status: 'draft', 'payments.99': { $exists: false } },
      { $push: { payments: payment } },
      { new: true, runValidators: true }
    );
    if (!batch) throw notFoundError();
    return {
      id: payment.paymentId,
      batchId,
      recipient: payment.recipient,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      verificationStatus: payment.verificationStatus,
      createdAt: payment.createdAt
    };
  }

  async executeBatch(batchId, userId) {
    const batch = await this.model.findOne({ batchId, requestedBy: userId });
    if (!batch) throw notFoundError();

    const error = new Error('Independent settlement provider is not configured');
    error.code = 'SETTLEMENT_PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  async getStats(userId) {
    const batches = (await this.model.find({ requestedBy: userId })).map(plain);
    return {
      totalBatches: batches.length,
      draft: batches.filter(batch => batch.status === 'draft').length,
      completed: 0,
      totalPayments: batches.reduce((total, batch) => total + (batch.payments?.length || 0), 0)
    };
  }

  setModelForTests(model) {
    if (process.env.NODE_ENV !== 'test') throw new Error('Model override is only available in tests');
    this.model = model || PaymentBatch;
  }
}

const service = new BatchPaymentService();
module.exports = service;
module.exports.BatchPaymentService = BatchPaymentService;

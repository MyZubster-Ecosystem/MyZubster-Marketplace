const mongoose = require('mongoose');

const DECIMAL_AMOUNT = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,18})?$/;
const CURRENCIES = ['BTC', 'ETH', 'XMR', 'MYZ', 'TARI', 'EUR', 'USD', 'GBP'];

const BatchPaymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true },
  recipient: { type: String, required: true, minlength: 3, maxlength: 256 },
  amount: {
    type: String,
    required: true,
    validate: {
      validator: value => DECIMAL_AMOUNT.test(value) && BigInt(value.replace('.', '')) > 0n,
      message: 'amount must be a positive decimal with at most 18 fractional digits'
    }
  },
  currency: { type: String, required: true, enum: CURRENCIES },
  status: { type: String, required: true, enum: ['draft'], default: 'draft' },
  verificationStatus: { type: String, required: true, enum: ['unverified'], default: 'unverified' },
  createdAt: { type: Date, required: true, default: Date.now }
}, { _id: false });

const PaymentBatchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, index: true },
  requestedBy: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 100 },
  status: { type: String, required: true, enum: ['draft'], default: 'draft', index: true },
  payments: { type: [BatchPaymentSchema], default: [] }
}, {
  timestamps: true,
  versionKey: false
});

PaymentBatchSchema.index({ requestedBy: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentBatch', PaymentBatchSchema);

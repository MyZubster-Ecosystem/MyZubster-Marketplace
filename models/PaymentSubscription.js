const mongoose = require('mongoose');

const DECIMAL_AMOUNT = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,18})?$/;

const PaymentSubscriptionSchema = new mongoose.Schema({
  subscriptionId: { type: String, required: true, unique: true, index: true },
  requestedBy: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 100 },
  amount: {
    type: String,
    required: true,
    validate: {
      validator: value => DECIMAL_AMOUNT.test(value) && BigInt(value.replace('.', '')) > 0n,
      message: 'amount must be a positive decimal with at most 18 fractional digits'
    }
  },
  currency: { type: String, required: true, enum: ['BTC', 'ETH', 'XMR', 'MYZ', 'TARI'] },
  interval: { type: String, required: true, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
  nextPayment: { type: Date, required: true },
  status: {
    type: String,
    required: true,
    enum: ['awaiting_external_payment', 'cancelled'],
    default: 'awaiting_external_payment',
    index: true
  },
  verificationStatus: {
    type: String,
    required: true,
    enum: ['unverified', 'verified'],
    default: 'unverified'
  },
  subscriber: { type: String, required: true, minlength: 3, maxlength: 256 }
}, {
  timestamps: true,
  versionKey: false
});

PaymentSubscriptionSchema.index({ requestedBy: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentSubscription', PaymentSubscriptionSchema);

const mongoose = require('mongoose');

const PaymentIntentSchema = new mongoose.Schema({
  intentId: { type: String, required: true, unique: true, index: true },
  rail: { type: String, required: true, enum: ['crypto', 'fiat'], index: true },
  requestedBy: { type: String, required: true, index: true },
  amount: {
    type: String,
    required: true,
    validate: {
      validator: value => /^(?:0|[1-9]\d{0,8})(?:\.\d{1,18})?$/.test(value) && Number(value) > 0,
      message: 'amount must be a positive decimal with at most 18 fractional digits'
    }
  },
  currency: { type: String, required: true, maxlength: 10 },
  recipient: { type: String, required: true, minlength: 3, maxlength: 256 },
  method: { type: String, maxlength: 50 },
  status: {
    type: String,
    required: true,
    enum: ['awaiting_external_payment', 'cancelled'],
    default: 'awaiting_external_payment'
  },
  verificationStatus: {
    type: String,
    required: true,
    enum: ['unverified', 'verified'],
    default: 'unverified'
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('PaymentIntent', PaymentIntentSchema);

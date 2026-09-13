const mongoose = require('mongoose');

const ConversionAuditSchema = new mongoose.Schema({
  quoteId: { type: String, required: true, index: true },
  requestedBy: { type: String, required: true, index: true },
  event: {
    type: String,
    required: true,
    enum: ['quote_issued', 'execution_requested', 'settled', 'execution_failed'],
    index: true
  },
  provider: { type: String, required: true, maxlength: 100 },
  from: { type: String, maxlength: 10 },
  to: { type: String, maxlength: 10 },
  amount: { type: String, maxlength: 64 },
  grossRecipientAmount: { type: String, maxlength: 64 },
  providerFee: { type: String, maxlength: 64 },
  myzubsterFee: { type: String, maxlength: 64 },
  recipientAmount: { type: String, maxlength: 64 },
  feeBasisPoints: { type: Number, min: 0, max: 10000 },
  providerTransactionId: { type: String, maxlength: 256 },
  evidenceHash: { type: String, maxlength: 128 },
  errorCode: { type: String, maxlength: 100 }
}, {
  timestamps: true,
  versionKey: false
});

ConversionAuditSchema.index({ quoteId: 1, requestedBy: 1, event: 1 });

module.exports = mongoose.model('ConversionAudit', ConversionAuditSchema);

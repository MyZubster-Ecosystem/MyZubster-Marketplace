const mongoose = require('mongoose');

const MyzRedemptionSchema = new mongoose.Schema({
  redemptionId: { type: String, required: true, unique: true, index: true },
  requestedBy: { type: String, required: true, index: true },
  quoteId: { type: String, required: true, index: true },
  provider: { type: String, required: true, maxlength: 100 },
  fromAmount: { type: String, required: true, maxlength: 64 },
  toAsset: { type: String, required: true, maxlength: 10 },
  expectedRecipientAmount: { type: String, required: true, maxlength: 64 },
  state: {
    type: String,
    required: true,
    enum: [
      'quote_accepted',
      'credit_reserved',
      'settlement_requested',
      'settled',
      'reconciled',
      'rolled_back',
      'failed'
    ],
    index: true
  },
  reservationId: { type: String, maxlength: 256 },
  providerTransactionId: { type: String, maxlength: 256 },
  evidenceHash: { type: String, maxlength: 128 },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  failureCode: { type: String, maxlength: 100 },
  reconciliationNote: { type: String, maxlength: 1000 }
}, {
  timestamps: true,
  versionKey: false
});

MyzRedemptionSchema.index({ requestedBy: 1, createdAt: -1 });

module.exports = mongoose.model('MyzRedemption', MyzRedemptionSchema);

const mongoose = require('mongoose');

const MyzLedgerReservationSchema = new mongoose.Schema({
  reservationId: { type: String, required: true, unique: true, index: true },
  redemptionId: { type: String, required: true, unique: true, index: true },
  requestedBy: { type: String, required: true, index: true },
  accountId: { type: String, required: true, index: true, maxlength: 256 },
  amountMyz: { type: String, required: true, maxlength: 64 },
  state: {
    type: String,
    required: true,
    enum: ['reserved', 'committed', 'released', 'failed'],
    index: true
  },
  canonicalBalanceAtReserve: { type: String, maxlength: 64 },
  canonicalLedgerRevision: { type: String, maxlength: 256 },
  canonicalDebitEntryId: { type: String, maxlength: 256, index: true },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  releaseReason: { type: String, maxlength: 256 },
  failureCode: { type: String, maxlength: 100 }
}, {
  timestamps: true,
  versionKey: false
});

MyzLedgerReservationSchema.index({ accountId: 1, state: 1, createdAt: -1 });

module.exports = mongoose.model('MyzLedgerReservation', MyzLedgerReservationSchema);

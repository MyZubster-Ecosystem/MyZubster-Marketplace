const mongoose = require('mongoose');

const MyzWorkerOperationSchema = new mongoose.Schema({
  operationId: { type: String, required: true, unique: true, index: true, maxlength: 256 },
  operationType: { type: String, required: true, index: true, maxlength: 100 },
  status: {
    type: String,
    required: true,
    enum: ['queued', 'running', 'retrying', 'recovery_required', 'completed', 'failed', 'cancelled'],
    index: true
  },
  redemptionId: { type: String, index: true, maxlength: 256 },
  reservationId: { type: String, index: true, maxlength: 256 },
  quoteId: { type: String, index: true, maxlength: 256 },
  providerTransactionId: { type: String, index: true, maxlength: 256 },
  attempt: { type: Number, required: true, min: 0, default: 0 },
  maxAttempts: { type: Number, required: true, min: 1, default: 1 },
  leaseOwner: { type: String, maxlength: 256 },
  leaseExpiresAt: { type: Date, index: true },
  nextRetryAt: { type: Date, index: true },
  startedAt: { type: Date },
  completedAt: { type: Date },
  lastErrorCode: { type: String, maxlength: 100 },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true,
  versionKey: false
});

MyzWorkerOperationSchema.index({ redemptionId: 1, updatedAt: -1 });
MyzWorkerOperationSchema.index({ reservationId: 1, updatedAt: -1 });
MyzWorkerOperationSchema.index({ status: 1, leaseExpiresAt: 1, nextRetryAt: 1 });

module.exports = mongoose.model('MyzWorkerOperation', MyzWorkerOperationSchema);

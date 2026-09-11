/**
 * EVA IONI - NFC Model
 * Modello per memorizzare piante e animali riconosciuti via NFC
 */

const mongoose = require('mongoose');

const nfcSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['plant', 'animal', 'object', 'person', 'unknown'],
    default: 'unknown'
  },
  name: {
    type: String,
    required: true,
    default: 'Nuova pianta/animale'
  },
  description: {
    type: String,
    default: ''
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  scanCount: {
    type: Number,
    default: 0
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indici per ricerche veloci
nfcSchema.index({ type: 1 });
nfcSchema.index({ lastSeen: -1 });

module.exports = mongoose.model('NFC', nfcSchema);

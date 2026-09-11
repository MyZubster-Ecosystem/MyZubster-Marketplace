const mongoose = require('mongoose');

const AntennaSchema = new mongoose.Schema({
  antennaId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'offline'],
    default: 'active'
  },
  lastPing: { type: Date, default: Date.now },
  ipAddress: String,
  port: Number,
  protocol: { type: String, enum: ['mqtt', 'websocket', 'lorawan'], default: 'mqtt' },
  ownerId: { type: String, index: true },
  metadata: {
    firmware: String,
    signalStrength: Number,
    batteryLevel: Number
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

AntennaSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Antenna', AntennaSchema);

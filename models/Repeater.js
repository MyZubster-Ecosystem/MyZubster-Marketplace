const mongoose = require('mongoose');

const RepeaterSchema = new mongoose.Schema({
  repeaterId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'offline'],
    default: 'active'
  },
  parentId: { type: String, index: true },
  children: [String],
  signalStrength: { type: Number, default: 0 },
  lastPing: { type: Date, default: Date.now },
  ownerId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Repeater', RepeaterSchema);

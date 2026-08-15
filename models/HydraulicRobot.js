const mongoose = require('mongoose');

const HydraulicRobotSchema = new mongoose.Schema({
  robotId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['pool_cleaning', 'pipe_cleaning', 'agricultural', 'irrigation', 'plumbing', 'construction'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'charging', 'maintenance', 'emergency'],
    default: 'active'
  },
  hydraulicSpecs: {
    pressure: { type: Number, default: 0 }, // PSI
    flowRate: { type: Number, default: 0 }, // L/min
    tankCapacity: { type: Number, default: 0 }, // Liters
    maxDepth: { type: Number, default: 0 } // Meters
  },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  capabilities: [String],
  batteryLevel: { type: Number, default: 100 },
  waterLevel: { type: Number, default: 100 },
  lastPing: { type: Date, default: Date.now },
  ownerId: { type: String, index: true },
  walletAddress: String,
  earnings: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },
  emergencyMode: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HydraulicRobot', HydraulicRobotSchema);

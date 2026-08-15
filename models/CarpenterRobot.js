const mongoose = require('mongoose');

const CarpenterRobotSchema = new mongoose.Schema({
  robotId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['cnc', 'carving', 'furniture', 'construction', 'artistic'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'calibrating'],
    default: 'active'
  },
  specifications: {
    maxMaterialSize: { type: Number, default: 0 }, // mm
    precision: { type: Number, default: 0.01 }, // mm
    spindleSpeed: { type: Number, default: 0 }, // RPM
    axisCount: { type: Number, default: 3 },
    weight: { type: Number, default: 0 } // kg
  },
  location: {
    lat: Number,
    lng: Number,
    address: String,
    workshop: String
  },
  capabilities: [String],
  materials: {
    wood: [String],
    composites: [String],
    metals: [String]
  },
  software: {
    cad: String,
    cam: String,
    version: String
  },
  lastPing: { type: Date, default: Date.now },
  ownerId: { type: String, index: true },
  walletAddress: String,
  earnings: { type: Number, default: 0 },
  projectsCompleted: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CarpenterRobot', CarpenterRobotSchema);

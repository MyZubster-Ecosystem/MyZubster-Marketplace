const mongoose = require('mongoose');

const ConstructionRobotSchema = new mongoose.Schema({
  robotId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['3d_printer', 'bricklayer', 'crane', 'inspection', 'demolition', 'excavator'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'calibrating', 'transport'],
    default: 'active'
  },
  specifications: {
    maxLoad: { type: Number, default: 0 }, // kg
    maxHeight: { type: Number, default: 0 }, // meters
    reach: { type: Number, default: 0 }, // meters
    precision: { type: Number, default: 0.01 }, // mm
    powerSource: { type: String, enum: ['electric', 'diesel', 'hybrid'], default: 'electric' }
  },
  location: {
    lat: Number,
    lng: Number,
    address: String,
    constructionSite: String
  },
  project: {
    id: String,
    name: String,
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ['planning', 'active', 'paused', 'completed'] }
  },
  capabilities: [String],
  materials: {
    concrete: { type: Boolean, default: false },
    steel: { type: Boolean, default: false },
    wood: { type: Boolean, default: false },
    bricks: { type: Boolean, default: false }
  },
  lastPing: { type: Date, default: Date.now },
  ownerId: { type: String, index: true },
  walletAddress: String,
  earnings: { type: Number, default: 0 },
  projectsCompleted: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ConstructionRobot', ConstructionRobotSchema);

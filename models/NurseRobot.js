const mongoose = require('mongoose');

const NurseRobotSchema = new mongoose.Schema({
  robotId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['transport', 'monitoring', 'assistance', 'hygiene', 'surgical'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'charging', 'maintenance'],
    default: 'active'
  },
  hospital: {
    name: { type: String, required: true },
    department: String,
    location: {
      lat: Number,
      lng: Number
    }
  },
  capabilities: [String],
  batteryLevel: { type: Number, default: 100 },
  lastPing: { type: Date, default: Date.now },
  ownerId: { type: String, index: true },
  walletAddress: String,
  earnings: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NurseRobot', NurseRobotSchema);

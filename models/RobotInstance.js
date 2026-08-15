/**
 * EVA IONI - Robot Instance Model
 * Istanza di un robot costruito
 */

const mongoose = require('mongoose');

const robotInstanceSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RobotTemplate',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['worker', 'soldier', 'scout', 'builder', 'agricultural'],
    required: true
  },
  status: {
    type: String,
    enum: ['building', 'active', 'idle', 'maintenance', 'destroyed'],
    default: 'building'
  },
  capabilities: [{
    name: String,
    description: String
  }],
  improvements: {
    type: Object,
    default: {}
  },
  builtFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RobotInstance'
  },
  generation: {
    type: Number,
    default: 1
  },
  lastActive: {
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

module.exports = mongoose.model('RobotInstance', robotInstanceSchema);

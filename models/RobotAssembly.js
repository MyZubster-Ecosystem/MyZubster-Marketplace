/**
 * EVA IONI - Robot Assembly Model
 * Processo di assemblaggio dei robot
 */

const mongoose = require('mongoose');

const robotAssemblySchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RobotTemplate',
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  partsSource: {
    type: String,
    enum: ['storage', 'purchase', 'recycle'],
    default: 'storage'
  },
  wallet: {
    type: String,
    default: ''
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  estimatedCompletion: {
    type: Date,
    required: true
  },
  completedAt: {
    type: Date
  },
  error: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('RobotAssembly', robotAssemblySchema);

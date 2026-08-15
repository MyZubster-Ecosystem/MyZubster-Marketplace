/**
 * EVA IONI - Robot Template Model
 * Modello base per i robot auto-replicanti
 */

const mongoose = require('mongoose');

const robotTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['worker', 'soldier', 'scout', 'builder', 'agricultural'],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  components: [{
    name: String,
    quantity: Number,
    description: String
  }],
  assemblyInstructions: [{
    step: Number,
    action: String,
    description: String
  }],
  capabilities: [{
    name: String,
    description: String,
    requires: [String]
  }],
  costMYZ: {
    type: Number,
    default: 100
  },
  costXMR: {
    type: Number,
    default: 0.01
  },
  imageUrl: {
    type: String,
    default: ''
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

module.exports = mongoose.model('RobotTemplate', robotTemplateSchema);

/**
 * EVA IONI - Drone Model
 * Modello per memorizzare i droni e le loro missioni
 */

const mongoose = require('mongoose');

const droneSchema = new mongoose.Schema({
  droneId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['quadcopter', 'hexacopter', 'fixed-wing', 'custom'],
    default: 'quadcopter'
  },
  model: {
    type: String,
    default: 'custom'
  },
  capabilities: [{
    type: String,
    enum: ['survey', 'irrigation', 'seeding', 'delivery', 'monitoring']
  }],
  status: {
    type: String,
    enum: ['idle', 'online', 'offline', 'mission', 'charging', 'error'],
    default: 'idle'
  },
  battery: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    alt: { type: Number, default: 0 }
  },
  speed: {
    type: Number,
    default: 0
  },
  altitude: {
    type: Number,
    default: 0
  },
  currentTask: {
    type: String,
    default: null
  },
  currentMission: {
    id: String,
    type: String,
    waypoints: Array,
    params: Object,
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'failed'],
      default: 'pending'
    },
    startedAt: Date,
    completedAt: Date
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
droneSchema.index({ status: 1 });
droneSchema.index({ battery: -1 });

module.exports = mongoose.model('Drone', droneSchema);

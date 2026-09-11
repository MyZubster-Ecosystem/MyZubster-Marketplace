/**
 * EVA IONI - Drone Event Model
 * Registra gli eventi dei droni
 */

const mongoose = require('mongoose');

const droneEventSchema = new mongoose.Schema({
  droneId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['status_update', 'mission_started', 'mission_completed', 'battery_low', 'error', 'landed', 'takeoff'],
    required: true
  },
  data: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('DroneEvent', droneEventSchema);

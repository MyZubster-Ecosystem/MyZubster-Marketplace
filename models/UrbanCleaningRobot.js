const mongoose = require('mongoose');

const UrbanCleaningRobotSchema = new mongoose.Schema({
  robotId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['sweeper', 'waste_collector', 'bulky_waste', 'street_washing', 'monitoring'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'charging', 'maintenance', 'cleaning'],
    default: 'active'
  },
  location: {
    lat: Number,
    lng: Number,
    zone: String, // Zona di competenza
    street: String
  },
  specifications: {
    batteryLife: { type: Number, default: 8 }, // ore
    capacity: { type: Number, default: 500 }, // litri
    speed: { type: Number, default: 5 }, // km/h
    cleaningWidth: { type: Number, default: 1.5 } // metri
  },
  schedule: {
    startTime: String,
    endTime: String,
    days: [String],
    route: [String]
  },
  lastCleaning: { type: Date },
  nextCleaning: { type: Date },
  stats: {
    kmCleaned: { type: Number, default: 0 },
    wasteCollected: { type: Number, default: 0 },
    bulkyItemsRemoved: { type: Number, default: 0 }
  },
  ownerId: { type: String, index: true },
  walletAddress: String,
  earnings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UrbanCleaningRobot', UrbanCleaningRobotSchema);

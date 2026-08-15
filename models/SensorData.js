const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
    gardenId: { type: String, required: true, index: true },
    ph: { type: Number, min: 0, max: 14 },
    ec: { type: Number, min: 0 },
    temperature: { type: Number },
    humidity: { type: Number, min: 0, max: 100 },
    timestamp: { type: Date, default: Date.now, index: true },
    metadata: {
        deviceId: String,
        battery: Number,
        signal: Number
    }
});

SensorDataSchema.index({ gardenId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', SensorDataSchema);

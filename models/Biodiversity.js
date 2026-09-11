const mongoose = require('mongoose');

const BiodiversitySchema = new mongoose.Schema({
    gardenId: { type: String, required: true, index: true },
    date: { type: Date, default: Date.now },
    species: [{
        name: String,
        count: Number,
        type: { type: String, enum: ['plant', 'pollinator', 'bird', 'insect'] },
        lastSeen: Date
    }],
    microclimate: {
        temperature: Number,
        humidity: Number,
        light: Number,
        soilMoisture: Number
    },
    metrics: {
        biodiversityIndex: Number,
        pollinatorActivity: Number,
        speciesCount: Number,
        ecosystemHealth: { type: Number, min: 0, max: 1 }
    },
    observations: [{
        type: String,
        description: String,
        severity: { type: String, enum: ['low', 'medium', 'high'] },
        timestamp: { type: Date, default: Date.now }
    }]
});

BiodiversitySchema.index({ gardenId: 1, date: -1 });

module.exports = mongoose.model('Biodiversity', BiodiversitySchema);

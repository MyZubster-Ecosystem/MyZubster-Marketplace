const mongoose = require('mongoose');

const FaunaSchema = new mongoose.Schema({
    gardenId: { type: String, required: true, index: true },
    species: [{
        name: { type: String, required: true },
        count: { type: Number, required: true, min: 0 },
        type: { type: String, enum: ['pollinator', 'bird', 'insect', 'other'] }
    }],
    date: { type: Date, default: Date.now },
    notes: String,
    userId: String
});

FaunaSchema.index({ gardenId: 1, date: -1 });

module.exports = mongoose.model('Fauna', FaunaSchema);

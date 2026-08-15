const mongoose = require('mongoose');

const ExchangeSchema = new mongoose.Schema({
    listingId: { type: String, required: true, unique: true },
    gardenId: { type: String, required: true },
    type: { type: String, enum: ['seed', 'cutting', 'plant'], required: true },
    name: { type: String, required: true },
    variety: String,
    quantity: { type: Number, required: true, min: 1 },
    priceXMR: { type: Number, required: true, min: 0 },
    available: { type: Boolean, default: true },
    description: String,
    imageUrl: String,
    shipping: {
        available: { type: Boolean, default: true },
        cost: { type: Number, default: 0 },
        regions: [String]
    },
    ratings: [{
        user: String,
        score: { type: Number, min: 1, max: 5 },
        comment: String,
        date: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Exchange', ExchangeSchema);

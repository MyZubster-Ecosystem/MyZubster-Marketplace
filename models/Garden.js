const mongoose = require('mongoose');

const GardenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  comune: String,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }
  },
  size: { type: Number, default: 0 },
  crops: [String],
  type: { type: String, default: 'urban' },
  status: { type: String, default: 'active' },
  isPublic: { type: Boolean, default: true },
  userId: String,
  tokenId: Number,
  nftMinted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Garden', GardenSchema);

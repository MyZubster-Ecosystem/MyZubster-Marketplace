const mongoose = require('mongoose');

const PrivateLocationSchema = new mongoose.Schema({
  algorithm: { type: String, required: true, enum: ['aes-256-gcm'] },
  keyVersion: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
  ciphertext: { type: String, required: true }
}, { _id: false });

const PublicLocationSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], required: true },
  coordinates: {
    type: [Number],
    required: true,
    validate: value => Array.isArray(value) && value.length === 2
  }
}, { _id: false });

const GardenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  comune: String,
  country: String,
  location: { type: PublicLocationSchema, default: undefined },
  locationVisibility: {
    type: String,
    enum: ['private', 'approximate', 'public'],
    default: 'private'
  },
  locationPrecision: {
    type: String,
    enum: ['hidden', 'approx-1km', 'exact'],
    default: 'hidden'
  },
  locationConsentVersion: String,
  locationConsentedAt: Date,
  privateLocation: { type: PrivateLocationSchema, select: false },
  size: { type: Number, default: 0 },
  crops: [String],
  type: { type: String, default: 'urban' },
  status: { type: String, default: 'active' },
  isPublic: { type: Boolean, default: false },
  userId: String,
  tokenId: Number,
  nftMinted: { type: Boolean, default: false },
  nftState: {
    type: String,
    enum: ['none', 'simulated', 'minted'],
    default: 'none'
  },
  nftChain: String,
  nftContractAddress: String,
  nftTransactionHash: String,
  createdAt: { type: Date, default: Date.now }
});

GardenSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Garden', GardenSchema);

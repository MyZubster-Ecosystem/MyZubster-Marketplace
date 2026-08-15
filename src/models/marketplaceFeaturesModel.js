const mongoose = require('mongoose');

// #17: Garden Products category
const gardenProductSchema = new mongoose.Schema({
  productId: {type: String, required: true, unique: true, index: true},
  name: {type: String, required: true},
  description: {type: String, default: ''},
  category: {type: String, enum: ['seeds','seedlings','tools','soil','fertilizer','pots','other'], required: true},
  price: {type: Number, required: true},
  currency: {type: String, default: 'MYZ'},
  sellerId: {type: String, required: true},
  stock: {type: Number, default: 0},
  images: [String],
  location: {lat: Number, lng: Number, address: String},
  status: {type: String, enum: ['active','sold_out','discontinued'], default: 'active'},
  createdAt: {type: Date, default: Date.now}
});

// #18: P2P seed and cutting exchange
const seedExchangeSchema = new mongoose.Schema({
  exchangeId: {type: String, required: true, unique: true, index: true},
  offerType: {type: String, enum: ['offer','request'], required: true},
  userId: {type: String, required: true},
  seedName: {type: String, required: true},
  seedType: {type: String, enum: ['seed','cutting','seedling','bulb','tuber'], required: true},
  quantity: {type: Number, required: true},
  unit: {type: String, default: 'pieces'},
  description: {type: String, default: ''},
  images: [String],
  location: {lat: Number, lng: Number, address: String},
  status: {type: String, enum: ['open','matched','completed','cancelled'], default: 'open'},
  matchedWith: {type: String, default: null},
  matchedAt: {type: Date, default: null},
  completedAt: {type: Date, default: null},
  createdAt: {type: Date, default: Date.now}
});

// #23: Public dashboard data
const gardenStatSchema = new mongoose.Schema({
  statId: {type: String, required: true, unique: true, index: true},
  gardenId: {type: String, required: true},
  gardenName: {type: String, required: true},
  location: {lat: Number, lng: Number, address: String},
  plants: {total: {type: Number, default: 0}, varieties: {type: Number, default: 0}},
  sensors: {temperature: Number, humidity: Number, ph: Number, soilMoisture: Number},
  lastUpdated: {type: Date, default: Date.now},
  isPublic: {type: Boolean, default: true},
  createdAt: {type: Date, default: Date.now}
});

module.exports = {
  GardenProduct: mongoose.model('GardenProduct', gardenProductSchema),
  SeedExchange: mongoose.model('SeedExchange', seedExchangeSchema),
  GardenStat: mongoose.model('GardenStat', gardenStatSchema)
};

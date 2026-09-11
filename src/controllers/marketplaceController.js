const { GardenProduct, SeedExchange, GardenStat } = require('../models/marketplaceFeaturesModel');
const { v4: uuidv4 } = require('uuid');

// #17: Garden Products
exports.createProduct = async (req, res) => {
  try {
    const { name, description, category, price, currency, sellerId, stock, images, lat, lng, address } = req.body;
    if (!name || !category || !price || !sellerId)
      return res.status(400).json({ error: 'name, category, price, sellerId required' });
    const p = new GardenProduct({
      productId: uuidv4().substring(0, 12), name, description, category, price,
      currency: currency || 'MYZ', sellerId, stock: stock || 0,
      images: images || [], location: { lat, lng, address }
    });
    await p.save();
    res.status(201).json({ message: 'Product created', productId: p.productId });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getProducts = async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = { status: status || 'active' };
    if (category) filter.category = category;
    const products = await GardenProduct.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ count: products.length, products });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getProduct = async (req, res) => {
  try {
    const p = await GardenProduct.findOne({ productId: req.params.productId });
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateProduct = async (req, res) => {
  try {
    const p = await GardenProduct.findOne({ productId: req.params.productId });
    if (!p) return res.status(404).json({ error: 'Not found' });
    Object.assign(p, req.body);
    await p.save();
    res.json({ message: 'Product updated', productId: p.productId });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// #18: P2P Seed and Cutting Exchange
exports.createExchange = async (req, res) => {
  try {
    const { offerType, userId, seedName, seedType, quantity, unit, description, images, lat, lng, address } = req.body;
    if (!offerType || !userId || !seedName || !seedType || !quantity)
      return res.status(400).json({ error: 'offerType, userId, seedName, seedType, quantity required' });
    const ex = new SeedExchange({
      exchangeId: uuidv4().substring(0, 12), offerType, userId, seedName, seedType,
      quantity, unit: unit || 'pieces', description, images: images || [],
      location: { lat, lng, address }
    });
    await ex.save();
    res.status(201).json({ message: 'Exchange created', exchangeId: ex.exchangeId, type: offerType });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getExchanges = async (req, res) => {
  try {
    const { type, status, seedType } = req.query;
    const filter = {};
    if (type) filter.offerType = type;
    if (status) filter.status = status;
    else filter.status = 'open';
    if (seedType) filter.seedType = seedType;
    const exchanges = await SeedExchange.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ count: exchanges.length, exchanges });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.matchExchange = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const ex = await SeedExchange.findOne({ exchangeId: req.params.exchangeId });
    if (!ex) return res.status(404).json({ error: 'Exchange not found' });
    if (ex.status !== 'open') return res.status(400).json({ error: `Exchange is ${ex.status}` });
    if (ex.userId === userId) return res.status(400).json({ error: 'Cannot match own exchange' });
    ex.status = 'matched'; ex.matchedWith = userId; ex.matchedAt = new Date();
    await ex.save();
    res.json({ message: 'Exchange matched', exchangeId: ex.exchangeId, matchedWith: userId });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.completeExchange = async (req, res) => {
  try {
    const ex = await SeedExchange.findOne({ exchangeId: req.params.exchangeId });
    if (!ex) return res.status(404).json({ error: 'Not found' });
    if (ex.status !== 'matched') return res.status(400).json({ error: `Must be matched (current: ${ex.status})` });
    ex.status = 'completed'; ex.completedAt = new Date();
    await ex.save();
    res.json({ message: 'Exchange completed', exchangeId: ex.exchangeId });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// #23: Public Dashboard
exports.getGardenStats = async (req, res) => {
  try {
    const { lat, lng, maxDist } = req.query;
    let query = GardenStat.find({ isPublic: true });
    if (lat && lng && maxDist) {
      const d = parseFloat(maxDist);
      query = query.where('location.lat').gte(parseFloat(lat) - d).lte(parseFloat(lat) + d)
                   .where('location.lng').gte(parseFloat(lng) - d).lte(parseFloat(lng) + d);
    }
    const stats = await query.sort({ lastUpdated: -1 }).limit(100);
    const totals = {
      totalGardens: stats.length,
      totalPlants: stats.reduce((s, g) => s + (g.plants?.total || 0), 0),
      totalVarieties: stats.reduce((s, g) => s + (g.plants?.varieties || 0), 0),
      avgTemp: stats.length > 0 ? stats.reduce((s, g) => s + (g.sensors?.temperature || 0), 0) / stats.length : 0,
      avgHumidity: stats.length > 0 ? stats.reduce((s, g) => s + (g.sensors?.humidity || 0), 0) / stats.length : 0
    };
    res.json({ totals, gardens: stats });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateGardenStats = async (req, res) => {
  try {
    const { gardenName, lat, lng, address, plants, sensors } = req.body;
    let stat = await GardenStat.findOne({ gardenId: req.params.gardenId });
    if (!stat) {
      stat = new GardenStat({ statId: uuidv4().substring(0, 12), gardenId: req.params.gardenId, gardenName, location: { lat, lng, address } });
    }
    if (gardenName) stat.gardenName = gardenName;
    if (plants) stat.plants = plants;
    if (sensors) stat.sensors = sensors;
    stat.lastUpdated = new Date();
    await stat.save();
    res.json({ message: 'Stats updated', gardenId: stat.gardenId });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

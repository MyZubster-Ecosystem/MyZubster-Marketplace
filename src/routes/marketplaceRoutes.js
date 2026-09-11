const express = require('express');
const router = express.Router();
const c = require('../controllers/marketplaceController');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret'); next(); }
  catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
};

// #17: Garden Products
router.post('/products', auth, c.createProduct);
router.get('/products', c.getProducts);
router.get('/products/:productId', c.getProduct);
router.put('/products/:productId', auth, c.updateProduct);

// #18: Seed Exchange
router.post('/exchanges', auth, c.createExchange);
router.get('/exchanges', c.getExchanges);
router.post('/exchanges/:exchangeId/match', auth, c.matchExchange);
router.post('/exchanges/:exchangeId/complete', auth, c.completeExchange);

// #23: Public Dashboard
router.get('/dashboard', c.getGardenStats);
router.put('/dashboard/:gardenId', auth, c.updateGardenStats);

module.exports = router;

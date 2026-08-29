const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireDatabaseReady } = require('../middleware/databaseReady');

router.use(authenticate, requireDatabaseReady);

function validatedUsage(body) {
  const messageSize = Number(body?.messageSize);
  const hops = Number(body?.hops);
  if (!Number.isInteger(messageSize) || messageSize < 0 || messageSize > 10_000_000) return null;
  if (!Number.isInteger(hops) || hops < 0 || hops > 10_000) return null;
  return { messageSize, hops };
}

// Calculate payment
router.post('/calculate', async (req, res) => {
  try {
    const usage = validatedUsage(req.body);
    if (!usage) return res.status(400).json({ error: 'Valid messageSize and hops are required' });
    const { messageSize, hops } = usage;
    
    const rate = 0.001; // MYZ per messaggio
    const hopBonus = 0.0005; // MYZ per hop
    const total = (messageSize * rate) + (hops * hopBonus);
    
    res.json({ 
      success: true, 
      data: { 
        total: Math.round(total * 1000) / 1000,
        messageSize,
        hops,
        rate,
        hopBonus
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process payment
router.post('/process', async (req, res) => {
  return res.status(503).json({
    error: 'Independent settlement provider is not configured',
    code: 'SETTLEMENT_PROVIDER_NOT_CONFIGURED'
  });
});

// Get earnings
router.get('/earnings/:repeaterId', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      data: { 
        repeaterId: req.params.repeaterId,
        total: 0,
        transactions: [],
        lastUpdated: new Date().toISOString()
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

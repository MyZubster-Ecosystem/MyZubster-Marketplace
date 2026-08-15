const express = require('express');
const router = express.Router();

// Calculate payment
router.post('/calculate', async (req, res) => {
  try {
    const { messageSize, hops } = req.body;
    
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
  try {
    const { sourceId, targetId, messageSize, hops } = req.body;
    const total = (messageSize * 0.001) + (hops * 0.0005);
    
    res.json({ 
      success: true, 
      data: { 
        transactionId: `tx_${Date.now()}`,
        source: sourceId,
        target: targetId,
        amount: Math.round(total * 1000) / 1000,
        currency: 'MYZ',
        status: 'completed',
        timestamp: new Date().toISOString()
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

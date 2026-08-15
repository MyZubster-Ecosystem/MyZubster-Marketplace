const express = require('express');
const router = express.Router();

// GET /api/payout/balance - Saldo MYZ/XMR
router.get('/balance', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        MYZ: 2040,
        XMR: 0.438,
        pending: 0,
        available: 2040
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payout/withdraw - Preleva MYZ/XMR
router.post('/withdraw', async (req, res) => {
  try {
    const { amount, currency, address } = req.body;

    if (!amount || !currency || !address) {
      return res.status(400).json({ error: 'amount, currency and address are required' });
    }

    if (currency !== 'MYZ' && currency !== 'XMR') {
      return res.status(400).json({ error: 'currency must be MYZ or XMR' });
    }

    if (amount > 2040) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    res.json({
      success: true,
      message: `Withdrawal of ${amount} ${currency} to ${address} initiated`,
      data: {
        txId,
        amount,
        currency,
        address,
        status: 'pending',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/payout/history - Storico prelievi
router.get('/history', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [
        {
          id: 1,
          amount: 600,
          currency: 'MYZ',
          status: 'completed',
          date: '2026-08-07',
          txId: 'tx_sim_1'
        },
        {
          id: 2,
          amount: 600,
          currency: 'MYZ',
          status: 'pending',
          date: '2026-08-07',
          txId: 'tx_sim_2'
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

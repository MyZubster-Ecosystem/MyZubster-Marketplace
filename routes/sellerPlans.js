const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireDatabaseReady } = require('../middleware/databaseReady');
const User = require('../models/User');

const FREE_PLAN = Object.freeze({
  id: 'free',
  name: 'Seller Free',
  price: 0,
  currency: 'EUR',
  creditCardRequired: false,
  description: 'Start selling for free. No credit card required.'
});

router.get('/plans', (req, res) => {
  return res.json({
    success: true,
    data: {
      plans: [FREE_PLAN],
      paidPlans: {
        available: false,
        paymentMethodRequired: true,
        message: 'Paid seller plans require a payment method and will be exposed only through the reviewed billing provider flow.'
      }
    }
  });
});

router.post('/upgrade', authenticate, requireDatabaseReady, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
  }
  if (user.role !== 'seller') {
    return res.status(403).json({ error: 'Seller account required', code: 'SELLER_ACCOUNT_REQUIRED' });
  }

  // Fail closed until a reviewed card/billing provider is connected. Never collect,
  // accept or persist raw card details in the Marketplace API.
  user.sellerPaymentMethodStatus = 'required';
  await user.save();
  return res.status(503).json({
    error: 'Paid seller billing provider is not configured',
    code: 'SELLER_BILLING_PROVIDER_NOT_CONFIGURED',
    data: {
      currentPlan: user.sellerPlan || 'free',
      paymentMethodRequired: true,
      rawCardDataAccepted: false
    }
  });
});

module.exports = router;

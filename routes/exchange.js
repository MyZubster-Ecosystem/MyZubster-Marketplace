const express = require('express');
const router = express.Router();
const Exchange = require('../models/Exchange');

// GET /api/exchange
router.get('/', async (req, res) => {
    try {
        const listings = await Exchange.find({ available: true });
        res.json({ success: true, data: listings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/exchange/:id
router.get('/:id', async (req, res) => {
    try {
        const listing = await Exchange.findOne({ listingId: req.params.id });
        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }
        res.json({ success: true, data: listing });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/exchange
router.post('/', async (req, res) => {
    try {
        const listing = new Exchange(req.body);
        await listing.save();
        res.status(201).json({ success: true, data: listing });
    } catch (error) {
        console.error('Error creating listing:', error);
        res.status(400).json({ error: error.message });
    }
});

// POST /api/exchange/:id/order
router.post('/:id/order', async (req, res) => {
    try {
        const listing = await Exchange.findOne({ listingId: req.params.id });
        if (!listing || !listing.available) {
            return res.status(400).json({ error: 'Listing not available' });
        }
        listing.available = false;
        await listing.save();
        res.json({ 
            success: true, 
            message: 'Order placed! Pay in XMR to complete.',
            xmrAmount: listing.priceXMR,
            listingId: listing.listingId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Fauna = require('../models/Fauna');

// POST /api/fauna/observe - Registra osservazione
router.post('/observe', async (req, res) => {
    try {
        const { gardenId, species, date, notes } = req.body;
        if (!gardenId || !species || species.length === 0) {
            return res.status(400).json({ error: 'gardenId and species are required' });
        }
        const observation = new Fauna({ gardenId, species, date, notes });
        await observation.save();
        res.status(201).json({ success: true, data: observation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fauna/stats - Statistiche fauna
router.get('/stats', async (req, res) => {
    try {
        const stats = await Fauna.aggregate([
            { $unwind: '$species' },
            {
                $group: {
                    _id: '$species.type',
                    total: { $sum: '$species.count' },
                    species: { $addToSet: '$species.name' }
                }
            }
        ]);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fauna/species - Lista specie rilevate
router.get('/species', async (req, res) => {
    try {
        const species = await Fauna.aggregate([
            { $unwind: '$species' },
            {
                $group: {
                    _id: '$species.name',
                    type: { $first: '$species.type' },
                    totalCount: { $sum: '$species.count' },
                    lastSeen: { $max: '$date' }
                }
            },
            { $sort: { totalCount: -1 } }
        ]);
        res.json({ success: true, data: species });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fauna/garden/:id - Dati fauna per orto
router.get('/garden/:id', async (req, res) => {
    try {
        const data = await Fauna.find({ gardenId: req.params.id }).sort({ date: -1 });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fauna/recommendations - Raccomandazioni
router.get('/recommendations', (req, res) => {
    const recs = [
        { type: 'plant_native', message: 'Pianta specie native per attirare più impollinatori' },
        { type: 'water', message: 'Crea piccole fonti d\'acqua per uccelli e insetti' },
        { type: 'nesting', message: 'Installa cassette per nidificazione di api solitarie' },
        { type: 'no_pesticides', message: 'Riduci l\'uso di pesticidi per proteggere gli insetti' }
    ];
    res.json({ success: true, data: recs });
});

// GET /api/fauna/trends - Andamento specie
router.get('/trends', async (req, res) => {
    try {
        const trends = await Fauna.aggregate([
            { $unwind: '$species' },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                        type: '$species.type'
                    },
                    total: { $sum: '$species.count' }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);
        res.json({ success: true, data: trends });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

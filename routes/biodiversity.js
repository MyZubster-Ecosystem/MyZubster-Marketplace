const express = require('express');
const router = express.Router();

// Mock data per Biodiversity
const mockBiodiversity = {
    totalObservations: 12,
    species: [
        { name: 'Bee', count: 34, type: 'pollinator' },
        { name: 'Butterfly', count: 12, type: 'pollinator' },
        { name: 'Tomato', count: 45, type: 'plant' },
        { name: 'Basil', count: 20, type: 'plant' }
    ],
    biodiversityIndex: 0.78,
    ecosystemHealth: 0.85
};

// GET /api/biodiversity/garden/:gardenId
router.get('/garden/:gardenId', (req, res) => {
    res.json({
        success: true,
        data: [mockBiodiversity],
        count: 1
    });
});

// GET /api/biodiversity/stats/:gardenId
router.get('/stats/:gardenId', (req, res) => {
    res.json({
        success: true,
        data: {
            totalObservations: mockBiodiversity.totalObservations,
            speciesCount: mockBiodiversity.species.length,
            biodiversityIndex: mockBiodiversity.biodiversityIndex,
            ecosystemHealth: mockBiodiversity.ecosystemHealth,
            topSpecies: mockBiodiversity.species.slice(0, 3),
            recommendations: [
                '🌱 Plant more native species to increase biodiversity',
                '🔄 Add compost to improve soil health',
                '🌸 Install bee houses to attract more pollinators'
            ]
        }
    });
});

// POST /api/biodiversity/observe
router.post('/observe', (req, res) => {
    const { gardenId, species, observations } = req.body;
    
    res.status(201).json({
        success: true,
        data: {
            gardenId,
            species,
            observations,
            timestamp: new Date().toISOString(),
            metrics: {
                biodiversityIndex: 0.78,
                pollinatorActivity: 34,
                speciesCount: species ? species.length : 0,
                ecosystemHealth: 0.85
            }
        }
    });
});

module.exports = router;

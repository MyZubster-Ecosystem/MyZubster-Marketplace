const express = require('express');
const router = express.Router();
const MLService = require('../services/mlService');

// GET /api/ml/status
router.get('/status', (req, res) => {
    res.json({
        success: true,
        data: {
            isTrained: MLService.isTrained || false,
            modelType: 'brain.js Neural Network',
            version: '1.0.0'
        }
    });
});

// GET /api/ml/predict
router.get('/predict', (req, res) => {
    try {
        const ph = parseFloat(req.query.ph) || 6.8;
        const ec = parseFloat(req.query.ec) || 1.2;
        const temperature = parseFloat(req.query.temperature) || 22.5;
        const humidity = parseFloat(req.query.humidity) || 65;
        
        const growthRate = MLService.predictGrowth(ph, ec, temperature, humidity);
        const recommendations = MLService.getRecommendations(ph, ec, temperature, humidity, growthRate);
        
        res.json({
            success: true,
            data: {
                growthRate: parseFloat(growthRate.toFixed(2)),
                recommendations: recommendations,
                parameters: { ph, ec, temperature, humidity }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/ml/predict - FIX: gestisce correttamente il body
router.post('/predict', (req, res) => {
    try {
        console.log('📥 POST /predict ricevuto:', req.body);
        
        const { ph, ec, temperature, humidity } = req.body;
        
        const phVal = parseFloat(ph) || 6.8;
        const ecVal = parseFloat(ec) || 1.2;
        const tempVal = parseFloat(temperature) || 22.5;
        const humVal = parseFloat(humidity) || 65;
        
        console.log(`📊 Parametri: pH=${phVal}, EC=${ecVal}, Temp=${tempVal}°C, Hum=${humVal}%`);
        
        const growthRate = MLService.predictGrowth(phVal, ecVal, tempVal, humVal);
        const recommendations = MLService.getRecommendations(phVal, ecVal, tempVal, humVal, growthRate);
        
        res.json({
            success: true,
            data: {
                growthRate: parseFloat(growthRate.toFixed(2)),
                recommendations: recommendations,
                parameters: { ph: phVal, ec: ecVal, temperature: tempVal, humidity: humVal }
            }
        });
    } catch (error) {
        console.error('❌ POST /predict error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/ml/train
router.post('/train', (req, res) => {
    try {
        const { sensorData } = req.body;
        
        if (!sensorData || !Array.isArray(sensorData)) {
            return res.status(400).json({ error: 'sensorData array required' });
        }
        
        const result = MLService.train(sensorData);
        res.json(result);
    } catch (error) {
        console.error('Training error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

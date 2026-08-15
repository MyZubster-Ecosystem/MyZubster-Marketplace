const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');

// GET /api/sensors/latest - Ultima lettura
router.get('/latest', async (req, res) => {
    try {
        const latest = await SensorData.findOne().sort({ timestamp: -1 });
        if (!latest) {
            return res.json({ success: true, data: null, message: 'No sensor data yet' });
        }
        res.json({ success: true, data: latest });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/sensors/garden/:gardenId - Storico per orto
router.get('/garden/:gardenId', async (req, res) => {
    try {
        const { gardenId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const data = await SensorData.find({ gardenId })
            .sort({ timestamp: -1 })
            .limit(limit);
        res.json({ success: true, data, count: data.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/sensors/garden/:gardenId/stats - Statistiche
router.get('/garden/:gardenId/stats', async (req, res) => {
    try {
        const { gardenId } = req.params;
        const data = await SensorData.find({ gardenId });
        
        if (data.length === 0) {
            return res.json({ success: true, data: null, message: 'No data for this garden' });
        }
        
        const stats = {
            totalReadings: data.length,
            ph: { avg: 0, min: Infinity, max: -Infinity },
            ec: { avg: 0, min: Infinity, max: -Infinity },
            temperature: { avg: 0, min: Infinity, max: -Infinity },
            humidity: { avg: 0, min: Infinity, max: -Infinity }
        };
        
        data.forEach(d => {
            if (d.ph !== undefined) {
                stats.ph.avg += d.ph;
                stats.ph.min = Math.min(stats.ph.min, d.ph);
                stats.ph.max = Math.max(stats.ph.max, d.ph);
            }
            if (d.ec !== undefined) {
                stats.ec.avg += d.ec;
                stats.ec.min = Math.min(stats.ec.min, d.ec);
                stats.ec.max = Math.max(stats.ec.max, d.ec);
            }
            if (d.temperature !== undefined) {
                stats.temperature.avg += d.temperature;
                stats.temperature.min = Math.min(stats.temperature.min, d.temperature);
                stats.temperature.max = Math.max(stats.temperature.max, d.temperature);
            }
            if (d.humidity !== undefined) {
                stats.humidity.avg += d.humidity;
                stats.humidity.min = Math.min(stats.humidity.min, d.humidity);
                stats.humidity.max = Math.max(stats.humidity.max, d.humidity);
            }
        });
        
        const count = data.length;
        stats.ph.avg = parseFloat((stats.ph.avg / count).toFixed(2));
        stats.ec.avg = parseFloat((stats.ec.avg / count).toFixed(2));
        stats.temperature.avg = parseFloat((stats.temperature.avg / count).toFixed(1));
        stats.humidity.avg = Math.round(stats.humidity.avg / count);
        
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/sensors/data - Invia dati sensore
router.post('/data', async (req, res) => {
    try {
        const { gardenId, ph, ec, temperature, humidity, metadata } = req.body;
        
        if (!gardenId) {
            return res.status(400).json({ error: 'gardenId is required' });
        }
        
        const sensorData = new SensorData({
            gardenId,
            ph,
            ec,
            temperature,
            humidity,
            metadata,
            timestamp: new Date()
        });
        
        await sensorData.save();
        res.status(201).json({
            success: true,
            data: sensorData,
            message: 'Sensor data saved successfully'
        });
    } catch (error) {
        console.error('Error saving sensor data:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

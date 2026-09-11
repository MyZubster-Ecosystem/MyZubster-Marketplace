/**
 * EVA IONI 2.0 - Richer API for Developers
 * API per sviluppatori complete per integrazione
 */

const express = require('express');
const router = express.Router();
const environmental = require('../sensors/environmental');
const irrigation = require('../irrigation/controller');
const biodiversity = require('../biodiversity/mapper');
const ai = require('../ai/recommendations');

// ============================================================
// ENVIRONMENTAL SENSORS API
// ============================================================

router.get('/sensors/environmental', (req, res) => {
  res.json({
    success: true,
    data: environmental.getCurrentData()
  });
});

router.get('/sensors/environmental/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({
    success: true,
    data: environmental.getHistory(limit)
  });
});

router.get('/sensors/air-quality', (req, res) => {
  res.json({
    success: true,
    data: environmental.getAirQuality()
  });
});

router.get('/sensors/weather', (req, res) => {
  res.json({
    success: true,
    data: environmental.getWeatherForecast()
  });
});

router.post('/sensors/calibrate', async (req, res) => {
  const result = await environmental.calibrateSensors();
  res.json(result);
});

// ============================================================
// IRRIGATION API
// ============================================================

router.get('/irrigation/status', (req, res) => {
  res.json({
    success: true,
    data: irrigation.getReport()
  });
});

router.post('/irrigation/start', (req, res) => {
  const { zone, duration } = req.body;
  const result = irrigation.startZone(zone, duration);
  res.json(result);
});

router.post('/irrigation/stop', (req, res) => {
  const { zone } = req.body;
  const result = irrigation.stopZone(zone);
  res.json(result);
});

router.post('/irrigation/auto', (req, res) => {
  const { enable } = req.body;
  irrigation.autoMode = enable;
  res.json({ success: true, autoMode: irrigation.autoMode });
});

router.post('/irrigation/schedule', (req, res) => {
  const { schedules } = req.body;
  const result = irrigation.scheduleIrrigation(schedules);
  res.json(result);
});

// ============================================================
// BIODIVERSITY API
// ============================================================

router.get('/biodiversity', (req, res) => {
  res.json({
    success: true,
    data: biodiversity.getReport()
  });
});

router.post('/biodiversity/detect', async (req, res) => {
  const { image } = req.body;
  const result = await biodiversity.detectSpecies(image);
  res.json({ success: true, data: result });
});

router.post('/biodiversity/invasive', (req, res) => {
  const { name, description, location } = req.body;
  const result = biodiversity.reportInvasive(name, description, location);
  res.json(result);
});

router.post('/biodiversity/citizen', (req, res) => {
  const result = biodiversity.citizenReport(req.body);
  res.json(result);
});

router.get('/biodiversity/map', (req, res) => {
  res.json({
    success: true,
    data: biodiversity.generateMapData()
  });
});

// ============================================================
// AI RECOMMENDATIONS API
// ============================================================

router.post('/ai/recommendations', async (req, res) => {
  const result = await ai.getRecommendations(req.body);
  res.json(result);
});

router.get('/ai/stats', (req, res) => {
  res.json({
    success: true,
    data: ai.getStats()
  });
});

router.post('/ai/learn', (req, res) => {
  const { plant, outcome } = req.body;
  ai.learn(plant, outcome);
  res.json({ success: true, message: 'AI updated' });
});

// ============================================================
// API DOCUMENTATION
// ============================================================

router.get('/docs', (req, res) => {
  res.json({
    name: 'EVA IONI 2.0 API',
    version: '2.0.0',
    endpoints: {
      sensors: {
        '/sensors/environmental': 'Get current environmental data',
        '/sensors/environmental/history': 'Get historical data',
        '/sensors/air-quality': 'Get air quality metrics',
        '/sensors/weather': 'Get weather forecast',
        '/sensors/calibrate': 'Calibrate sensors'
      },
      irrigation: {
        '/irrigation/status': 'Get irrigation status',
        '/irrigation/start': 'Start irrigation zone',
        '/irrigation/stop': 'Stop irrigation zone',
        '/irrigation/auto': 'Enable/disable auto mode',
        '/irrigation/schedule': 'Set irrigation schedule'
      },
      biodiversity: {
        '/biodiversity': 'Get biodiversity report',
        '/biodiversity/detect': 'Detect species from image',
        '/biodiversity/invasive': 'Report invasive species',
        '/biodiversity/citizen': 'Submit citizen science report',
        '/biodiversity/map': 'Get map data'
      },
      ai: {
        '/ai/recommendations': 'Get AI recommendations',
        '/ai/stats': 'Get AI statistics',
        '/ai/learn': 'Train AI with new data'
      }
    }
  });
});

module.exports = router;

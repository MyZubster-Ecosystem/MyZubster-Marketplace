const express = require('express');
const router = express.Router();
const IotSensorService = require('../services/iotSensorService');

router.post('/register', (req, res) => {
  const sensor = IotSensorService.registerSensor(req.body);
  res.json({ success: true, data: sensor });
});

router.post('/simulate/:sensorId', (req, res) => {
  const reading = IotSensorService.simulateReading(req.params.sensorId);
  res.json({ success: true, data: reading });
});

router.get('/latest/:gardenId', (req, res) => {
  const readings = IotSensorService.getLatestReadings(req.params.gardenId);
  res.json({ success: true, data: readings });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: IotSensorService.getStats() });
});

module.exports = router;

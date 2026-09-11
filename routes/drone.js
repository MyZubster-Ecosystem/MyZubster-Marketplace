/**
 * EVA IONI - Drone Management Routes
 * Controllo e monitoraggio dei droni per orti urbani
 */

const express = require('express');
const router = express.Router();
const Drone = require('../models/Drone');

// ============================================================
// REGISTRA UN NUOVO DRONE
// ============================================================

router.post('/register', async (req, res) => {
  try {
    const { droneId, name, type, model, capabilities } = req.body;
    
    if (!droneId || !name) {
      return res.status(400).json({ error: 'droneId and name are required' });
    }

    // Verifica se esiste già
    let existing = await Drone.findOne({ droneId });
    if (existing) {
      return res.status(409).json({ 
        error: 'Drone already registered',
        data: existing 
      });
    }

    const drone = new Drone({
      droneId,
      name,
      type: type || 'quadcopter',
      model: model || 'custom',
      capabilities: capabilities || [],
      status: 'idle',
      battery: 100,
      location: { lat: 0, lng: 0, alt: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await drone.save();

    res.json({
      success: true,
      message: 'Drone registered successfully',
      data: drone
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// AGGIORNA STATO DEL DRONE
// ============================================================

router.put('/:droneId/status', async (req, res) => {
  try {
    const { droneId } = req.params;
    const { status, battery, location, speed, altitude, task } = req.body;

    const drone = await Drone.findOne({ droneId });
    if (!drone) {
      return res.status(404).json({ error: 'Drone not found' });
    }

    if (status) drone.status = status;
    if (battery !== undefined) drone.battery = battery;
    if (location) drone.location = location;
    if (speed !== undefined) drone.speed = speed;
    if (altitude !== undefined) drone.altitude = altitude;
    if (task) drone.currentTask = task;
    drone.updatedAt = new Date();

    await drone.save();

    // Registra l'evento
    await DroneEvent.create({
      droneId: droneId,
      type: 'status_update',
      data: { status, battery, location }
    });

    res.json({
      success: true,
      data: drone
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// AVVIA UNA MISSIONE
// ============================================================

router.post('/:droneId/mission', async (req, res) => {
  try {
    const { droneId } = req.params;
    const { type, waypoints, params } = req.body;

    const drone = await Drone.findOne({ droneId });
    if (!drone) {
      return res.status(404).json({ error: 'Drone not found' });
    }

    const mission = {
      id: `mission-${Date.now()}`,
      type: type || 'survey',
      waypoints: waypoints || [],
      params: params || {},
      status: 'pending',
      startedAt: new Date()
    };

    drone.currentMission = mission;
    drone.status = 'mission';
    drone.updatedAt = new Date();
    await drone.save();

    // Registra l'evento
    await DroneEvent.create({
      droneId: droneId,
      type: 'mission_started',
      data: { mission }
    });

    res.json({
      success: true,
      message: 'Mission started',
      data: { mission }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// LISTA DRONI
// ============================================================

router.get('/list', async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    
    const drones = await Drone.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: drones,
      count: drones.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// STATISTICHE DRONI
// ============================================================

router.get('/stats', async (req, res) => {
  try {
    const total = await Drone.countDocuments();
    const byStatus = await Drone.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const avgBattery = await Drone.aggregate([
      { $group: { _id: null, avg: { $avg: '$battery' } } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        byStatus,
        avgBattery: avgBattery[0]?.avg || 0,
        online: await Drone.countDocuments({ status: 'online' }),
        idle: await Drone.countDocuments({ status: 'idle' }),
        mission: await Drone.countDocuments({ status: 'mission' })
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// EVENTI DEL DRONE
// ============================================================

router.get('/:droneId/events', async (req, res) => {
  try {
    const { droneId } = req.params;
    const { limit = 50 } = req.query;

    const events = await DroneEvent.find({ droneId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

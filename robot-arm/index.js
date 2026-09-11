/**
 * MyZubster - Robotic Arm Controller
 * Per orti urbani: irrigazione, analisi suolo, semina
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

const PORT = process.env.ARM_PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Motor Controller (simulato per ora)
const motorController = require('./src/motorController');
const sensorIntegrator = require('./src/sensorIntegrator');

// Stato del braccio
const armState = {
  position: { x: 0, y: 0, z: 0 },
  gripper: 'open',
  status: 'idle',
  currentTask: null
};

// ============================================================
// API ENDPOINTS
// ============================================================

// Health check
app.get('/api/arm/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    arm: 'MyZubster Robot Arm',
    state: armState
  });
});

// Muovi il braccio a una posizione
app.post('/api/arm/move', (req, res) => {
  const { x, y, z } = req.body;
  if (x === undefined || y === undefined || z === undefined) {
    return res.status(400).json({ error: 'x, y, z are required' });
  }

  // Simula il movimento
  armState.position = { x, y, z };
  armState.status = 'moving';

  // Notifica via WebSocket
  io.emit('arm-move', armState.position);

  setTimeout(() => {
    armState.status = 'idle';
    io.emit('arm-status', armState);
  }, 2000);

  res.json({
    success: true,
    message: 'Braccio in movimento',
    position: armState.position
  });
});

// Apri/chiudi gripper
app.post('/api/arm/gripper', (req, res) => {
  const { action } = req.body;
  if (action !== 'open' && action !== 'close') {
    return res.status(400).json({ error: 'action must be "open" or "close"' });
  }

  armState.gripper = action;
  io.emit('arm-gripper', armState.gripper);

  res.json({
    success: true,
    message: `Gripper ${action}`,
    gripper: armState.gripper
  });
});

// Esegui un task (irrigazione, semina, analisi)
app.post('/api/arm/task', (req, res) => {
  const { task, params } = req.body;
  const validTasks = ['water', 'plant', 'analyze', 'harvest'];
  
  if (!validTasks.includes(task)) {
    return res.status(400).json({ 
      error: `task must be one of: ${validTasks.join(', ')}` 
    });
  }

  armState.currentTask = task;
  armState.status = 'working';

  io.emit('arm-task', { task, params });

  // Simula il completamento del task
  setTimeout(() => {
    armState.status = 'idle';
    armState.currentTask = null;
    io.emit('arm-status', armState);
  }, 5000);

  res.json({
    success: true,
    message: `Task "${task}" avviato`,
    task: task,
    params: params
  });
});

// Leggi dati dai sensori
app.get('/api/arm/sensors', async (req, res) => {
  try {
    const data = await sensorIntegrator.readSensors();
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// WEBSOCKET CONNECTION
// ============================================================

io.on('connection', (socket) => {
  console.log('🟢 Nuova connessione WebSocket');
  
  // Invia stato iniziale
  socket.emit('arm-state', armState);

  socket.on('arm-command', (data) => {
    console.log('📡 Comando ricevuto:', data);
    // Gestisci comandi in tempo reale
  });

  socket.on('disconnect', () => {
    console.log('🔴 Disconnessione WebSocket');
  });
});

// ============================================================
// AVVIA IL SERVER
// ============================================================

server.listen(PORT, () => {
  console.log(`🦾 MyZubster Robot Arm avviato sulla porta ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/arm`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});

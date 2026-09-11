/**
 * EVA IONI 2.0 - Main Application
 * Robot open-source per orti urbani con AI, sensori ambientali e irrigazione autonoma
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' }
});

const PORT = process.env.EVA_PORT || 5015;

// Middleware
app.use(cors());
app.use(express.json());

// Import modules
const environmental = require('./src/sensors/environmental');
const irrigation = require('./src/irrigation/controller');
const biodiversity = require('./src/biodiversity/mapper');
const ai = require('./src/ai/recommendations');
const apiRoutes = require('./src/api/routes');

// ============================================================
// WEBSOCKET EVENTS
// ============================================================

io.on('connection', (socket) => {
  console.log('🔌 EVA IONI 2.0 client connected');

  // Send initial data
  socket.emit('environmental', environmental.getCurrentData());
  socket.emit('irrigation', irrigation.getReport());
  socket.emit('biodiversity', biodiversity.getReport());
  socket.emit('ai-stats', ai.getStats());

  // Listen for commands
  socket.on('command', (data) => {
    console.log('📡 Command received:', data);
    // Handle commands
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected');
  });
});

// ============================================================
// API ROUTES
// ============================================================

app.use('/api/eva', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '2.0.0',
    name: 'EVA IONI',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// START ALL SERVICES
// ============================================================

// Start environmental sensors
environmental.startMonitoring(5000);
environmental.on('sensor-data', (data) => {
  io.emit('sensor-data', data);
});

// Start irrigation auto-cycle
setInterval(() => {
  irrigation.autoCycle();
}, 10000);

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  🌱 EVA IONI 2.0 - Robot for Urban Gardens         ║
║  🚀 Version: 2.0.0                                  ║
║  📡 Port: ${PORT}                                     ║
║  🔗 API: http://localhost:${PORT}/api/eva             ║
║  🔌 WebSocket: ws://localhost:${PORT}                ║
╚═══════════════════════════════════════════════════════╝
  `);
  
  console.log('📡 Services started:');
  console.log('  🌍 Environmental sensors monitoring');
  console.log('  💧 Irrigation system ready');
  console.log('  🗺️  Biodiversity mapping active');
  console.log('  🧠 AI recommendations engine running');
  console.log('  🔌 WebSocket server ready');
});

module.exports = { app, server };

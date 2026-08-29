const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { isDatabaseReady } = require('./middleware/databaseReady');

mongoose.set('bufferCommands', false);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));

// Importa route
const authRoutes = require('./routes/auth');
const gardenRoutes = require('./routes/gardens');
const sensorRoutes = require('./routes/sensors');
const exchangeRoutes = require('./routes/exchange');
const mlRoutes = require('./routes/ml');
const biodiversityRoutes = require('./routes/biodiversity');
const faunaRoutes = require('./routes/fauna');
const payoutRoutes = require('./routes/payout');
const nftRoutes = require('./routes/nft');
const antennaRoutes = require('./routes/antenna');
const repeaterRoutes = require('./routes/repeater');
const repeaterPaymentRoutes = require('./routes/repeaterPayment');
const academicRobotRoutes = require('./routes/academicRobot');
const nurseRobotRoutes = require('./routes/nurseRobot');
const hydraulicRobotRoutes = require('./routes/hydraulicRobot');
const carpenterRobotRoutes = require('./routes/carpenterRobot');
const constructionRobotRoutes = require('./routes/constructionRobot');
const schedulerRoutes = require('./routes/scheduler');
const robotArmRoutes = require('./routes/robotArm');
const iotSensorRoutes = require('./routes/iotSensor');
const seedMarketRoutes = require('./routes/seedMarket');
const gardenMapRoutes = require('./routes/gardenMap');
const dashboardRoutes = require('./routes/dashboard');
const cryptoPaymentRoutes = require('./routes/cryptoPayment');
const batchPaymentRoutes = require('./routes/batchPayment');
const subscriptionRoutes = require('./routes/subscription');
const fiatPaymentRoutes = require('./routes/fiatPayment');
const urbanCleaningRoutes = require('./routes/urbanCleaning');

// Rotte API
app.use('/api/auth', authRoutes);
app.use('/api/gardens', gardenRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/biodiversity', biodiversityRoutes);
app.use('/api/fauna', faunaRoutes);
app.use('/api/payout', payoutRoutes);
app.use('/api/nft', nftRoutes);
app.use('/api/antenna', antennaRoutes);
app.use('/api/repeater', repeaterRoutes);
app.use('/api/repeater-payment', repeaterPaymentRoutes);
app.use('/api/academic', academicRobotRoutes);
app.use('/api/nurse-robot', nurseRobotRoutes);
app.use('/api/hydraulic-robot', hydraulicRobotRoutes);
app.use('/api/carpenter-robot', carpenterRobotRoutes);
app.use('/api/construction-robot', constructionRobotRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/robot-arm', robotArmRoutes);
app.use('/api/iot-sensor', iotSensorRoutes);
app.use('/api/seed-market', seedMarketRoutes);
app.use('/api/garden-map', gardenMapRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/crypto-payment', cryptoPaymentRoutes);
app.use('/api/batch-payment', batchPaymentRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/fiat-payment', fiatPaymentRoutes);
app.use('/api/urban-cleaning', urbanCleaningRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'MyZubster-Marketplace',
        database: isDatabaseReady() ? 'ready' : 'unavailable',
        timestamp: new Date().toISOString(),
        message: 'MyZubster Marketplace API'
    });
});

app.get('/api/ready', (req, res) => {
    const ready = isDatabaseReady();
    return res.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'not_ready',
        service: 'MyZubster-Marketplace',
        database: ready ? 'ready' : 'unavailable'
    });
});

// Dashboard Hera
app.get('/dashboard-hera', (req, res) => {
    res.sendFile('/var/www/myzubster.com/public/dashboard-hera.html');
});

// Robot stats
app.get('/api/self-replicating-robot/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            total: 9,
            byStatus: [
                { _id: 'building', count: 7 },
                { _id: 'active', count: 2 }
            ],
            byType: [{ _id: 'builder', count: 9 }],
            avgGeneration: 2.8
        }
    });
});

// Robot instances
app.get('/api/self-replicating-robot/instances', (req, res) => {
    res.json({
        success: true,
        data: [
            { _id: '1', generation: 1, status: 'active', name: 'EVA Builder Bot #1' },
            { _id: '2', generation: 1, status: 'active', name: 'EVA Builder Bot #2' },
            { _id: '3', generation: 2, status: 'building', name: 'EVA Builder Bot #2 Clone #1' },
            { _id: '4', generation: 2, status: 'building', name: 'EVA Builder Bot #2 Clone #2' },
            { _id: '5', generation: 3, status: 'building', name: 'EVA Builder Bot #2 Clone #2 Clone #1' },
            { _id: '6', generation: 4, status: 'building', name: 'EVA Builder Bot #2 Clone #2 Clone #1 Clone #1' },
            { _id: '7', generation: 4, status: 'building', name: 'EVA Builder Bot #2 Clone #2 Clone #1 Clone #2' },
            { _id: '8', generation: 4, status: 'building', name: 'EVA Builder Bot #2 Clone #2 Clone #1 Clone #1' },
            { _id: '9', generation: 4, status: 'building', name: 'EVA Builder Bot #2 Clone #2 Clone #1 Clone #2' }
        ],
        count: 9
    });
});

// Clone robot
app.post('/api/self-replicating-robot/clone/:id', (req, res) => {
    res.json({
        success: true,
        message: 'Cloning started: 2 robots being built',
        data: {
            sourceRobot: req.params.id,
            clones: ['new-id-1', 'new-id-2'],
            generation: 4,
            quantity: 2,
            cost: 300
        }
    });
});

// Funzione WebSocket
function setupWebSocket(server) {
    try {
        const WebSocket = require('ws');
        const wss = new WebSocket.Server({ server, path: '/ws' });
        wss.on('connection', (ws) => {
            console.log('🟢 WebSocket client connected');
            ws.send(JSON.stringify({ type: 'connected', message: 'Welcome to MyZubster WebSocket!' }));
            ws.on('message', (message) => {
                console.log('📩 Received:', message.toString());
                ws.send(JSON.stringify({ type: 'echo', data: message.toString() }));
            });
            ws.on('close', () => {
                console.log('🔴 WebSocket client disconnected');
            });
        });
        console.log('📡 WebSocket server running on /ws');
    } catch (err) {
        console.error('❌ WebSocket error:', err.message);
    }
}

const PORT = process.env.PORT || 4000;

async function startServer(options = {}) {
    const port = options.port || PORT;
    const mongoUri = options.mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster';
    const serverSelectionTimeoutMS = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000);

    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Server avviato sulla porta ${port}`);
        console.log(`🔍 Liveness: http://localhost:${port}/api/health`);
        console.log(`✅ Readiness: http://localhost:${port}/api/ready`);
    });
    setupWebSocket(server);

    try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS });
        console.log('✅ MongoDB connesso');
    } catch (error) {
        console.error('❌ MongoDB non disponibile; auth e pagamenti restano bloccati:', error.message);
    }

    return server;
}

if (require.main === module) {
    startServer().catch(error => {
        console.error('❌ Avvio server fallito:', error.message);
        process.exitCode = 1;
    });
}

module.exports = app;
module.exports.startServer = startServer;

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'MyZubster Marketplace API'
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

// Avvia server
const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster')
    .then(() => {
        console.log('✅ MongoDB connesso');
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server avviato sulla porta ${PORT}`);
            console.log(`🌐 URL: http://localhost:${PORT}`);
            console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
            console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
            console.log(`🌱 Gardens: http://localhost:${PORT}/api/gardens`);
            console.log(`📡 Sensors: http://localhost:${PORT}/api/sensors`);
            console.log(`🌿 Exchange: http://localhost:${PORT}/api/exchange`);
            console.log(`🧠 ML: http://localhost:${PORT}/api/ml`);
            console.log(`🦋 Fauna: http://localhost:${PORT}/api/fauna`);
            console.log(`💎 Payout: http://localhost:${PORT}/api/payout`);
            console.log(`🎨 NFT: http://localhost:${PORT}/api/nft`);
            console.log(`📡 Antenna: http://localhost:${PORT}/api/antenna`);
            console.log(`🔁 Repeater: http://localhost:${PORT}/api/repeater`);
            console.log(`💰 Repeater Payment: http://localhost:${PORT}/api/repeater-payment`);
            console.log(`✅ Tutte le route caricate!`);
        });
        setupWebSocket(server);
    })
    .catch(err => {
        console.error('❌ Errore DB:', err.message);
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server avviato sulla porta ${PORT} (senza DB)`);
        });
        setupWebSocket(server);
    });

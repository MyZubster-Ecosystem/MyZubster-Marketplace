/**
 * CleanStreetBot - MyZubster Robot per Pulizia Strade
 * 
 * Monitora e segnala lo stato di pulizia delle strade.
 */

const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.CLEANSTREET_PORT || 5013;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:5002';
const HERA_API_URL = process.env.HERA_API_URL || 'https://api.hera.it/v1/reports';

// Database in memoria
const reports = [];
const zones = [
  { id: 'z1', name: 'Centro Storico', lat: 44.060, lng: 12.565, priority: 'high' },
  { id: 'z2', name: 'Zona Marina', lat: 44.070, lng: 12.575, priority: 'medium' },
  { id: 'z3', name: 'Zona Nord', lat: 44.080, lng: 12.555, priority: 'low' },
];

// Stato del robot
let robotState = {
  status: 'idle',
  position: { lat: 44.060, lng: 12.565 },
  battery: 85,
  kmCleaned: 0,
  lastReport: null
};

// ============================================================
// API ENDPOINTS
// ============================================================

// 1. Segnala un rifiuto
app.post('/api/cleanstreet/report', async (req, res) => {
  const { lat, lng, type, description, image } = req.body;
  
  if (!lat || !lng || !type) {
    return res.status(400).json({ error: 'lat, lng and type are required' });
  }

  const report = {
    id: `report-${Date.now()}`,
    lat,
    lng,
    type,
    description: description || 'Rifiuto segnalato',
    image: image || null,
    status: 'pending',
    priority: type === 'pericoloso' ? 'high' : 'medium',
    reportedAt: new Date().toISOString()
  };

  reports.push(report);
  robotState.lastReport = report.id;

  // Se è pericoloso, crea subito un job
  if (type === 'pericoloso' || type === 'ingombrante') {
    const job = await createCleaningJob(report);
    
    // Notifica Hera
    await notifyHera(report);

    return res.json({
      success: true,
      message: '⚠️ Rifiuto pericoloso segnalato, intervento immediato',
      report,
      job
    });
  }

  res.json({
    success: true,
    message: 'Segnalazione ricevuta',
    report,
    pendingReports: reports.filter(r => r.status === 'pending').length
  });
});

// 2. Stato del robot
app.get('/api/cleanstreet/status', (req, res) => {
  res.json({
    success: true,
    data: {
      ...robotState,
      pendingReports: reports.filter(r => r.status === 'pending').length,
      totalReports: reports.length
    }
  });
});

// 3. Lista segnalazioni
app.get('/api/cleanstreet/reports', (req, res) => {
  const { status, limit = 10 } = req.query;
  
  let filtered = reports;
  if (status) {
    filtered = filtered.filter(r => r.status === status);
  }
  
  res.json({
    success: true,
    data: filtered.slice(0, parseInt(limit)),
    count: filtered.length
  });
});

// 4. Avvia pulizia di una zona
app.post('/api/cleanstreet/clean', async (req, res) => {
  const { zoneId } = req.body;
  
  const zone = zones.find(z => z.id === zoneId);
  if (!zone) {
    return res.status(404).json({ error: 'Zona non trovata' });
  }

  robotState.status = 'cleaning';
  robotState.position = { lat: zone.lat, lng: zone.lng };

  // Simula pulizia
  const cleaned = Math.floor(Math.random() * 100) + 50;
  robotState.kmCleaned += cleaned / 1000;

  // Crea job di pagamento
  const job = await createCleaningJob({
    type: 'pulizia',
    description: `Pulizia zona ${zone.name}`,
    zone: zone.name,
    km: cleaned / 1000
  });

  setTimeout(() => {
    robotState.status = 'idle';
  }, 3000);

  res.json({
    success: true,
    message: `🧹 Pulizia avviata per ${zone.name}`,
    data: {
      zone,
      cleaned: `${cleaned}m²`,
      kmCleaned: robotState.kmCleaned,
      job
    }
  });
});

// 5. Integrazione con Hera
app.post('/api/cleanstreet/hera-report', async (req, res) => {
  try {
    const response = await axios.post(HERA_API_URL, {
      timestamp: new Date().toISOString(),
      robot: 'CleanStreetBot',
      reports: reports.filter(r => r.status === 'pending').length,
      totalCleaned: robotState.kmCleaned,
      zones: zones
    });

    res.json({
      success: true,
      message: 'Report inviato a Hera',
      response: response.data
    });
  } catch (error) {
    console.error('Error sending to Hera:', error.message);
    res.status(500).json({ error: 'Errore con Hera API' });
  }
});

// ============================================================
// FUNZIONI DI SUPPORTO
// ============================================================

async function createCleaningJob(data) {
  try {
    const response = await axios.post(`${GATEWAY_URL}/api/robot/assign`, {
      robotId: 'cleanstreet-001',
      jobId: `cleaning-${Date.now()}`,
      clientId: 'comune-rimini',
      amount: data.type === 'pericoloso' ? 150 : 50,
      currency: 'MYZ',
      description: data.description,
      location: data.zone || 'Rimini'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating job:', error.message);
    return { error: error.message };
  }
}

async function notifyHera(report) {
  try {
    await axios.post(`${HERA_API_URL}/urgent`, {
      reportId: report.id,
      lat: report.lat,
      lng: report.lng,
      type: report.type,
      description: report.description,
      priority: 'high'
    });
  } catch (error) {
    console.error('Error notifying Hera:', error.message);
  }
}

// ============================================================
// AVVIA IL SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`🧹 CleanStreetBot avviato sulla porta ${PORT}`);
  console.log(`📡 Endpoint disponibili:`);
  console.log(`  POST /api/cleanstreet/report - Segnala rifiuto`);
  console.log(`  GET  /api/cleanstreet/status - Stato robot`);
  console.log(`  GET  /api/cleanstreet/reports - Lista segnalazioni`);
  console.log(`  POST /api/cleanstreet/clean - Avvia pulizia zona`);
  console.log(`  POST /api/cleanstreet/hera-report - Invia report a Hera`);
});

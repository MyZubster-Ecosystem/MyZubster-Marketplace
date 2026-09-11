const express = require('express');
const app = express();
const PORT = 5001;

app.use(express.json());

// Store per i job (simulato)
const jobs = {};

// Health check
app.get('/api/robot/agricolo/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    robot: 'AgricoloBot - Test'
  });
});

// Assign job
app.post('/api/robot/agricolo/assign', (req, res) => {
  const { gardenId, duration, wallet } = req.body;
  if (!gardenId || !duration || !wallet) {
    return res.status(400).json({ error: 'gardenId, duration and wallet are required' });
  }

  const jobId = '67a6c7cc43c87dff77383039b';
  const job = {
    _id: jobId,
    gardenId: gardenId,
    duration: duration,
    wallet: wallet,
    status: 'assigned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  jobs[jobId] = job;

  res.json({
    success: true,
    data: { job: job },
    message: 'Lavoro assegnato con successo (TEST)'
  });
});

// Status job
app.get('/api/robot/agricolo/status/:id', (req, res) => {
  const jobId = req.params.id;
  const job = jobs[jobId];
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json({
    success: true,
    data: job
  });
});

// Execute monitoring
app.post('/api/robot/agricolo/execute', (req, res) => {
  const { jobId } = req.body;
  const job = jobs[jobId];
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  job.status = 'in_progress';
  job.sensorData = {
    ph: 6.5 + (Math.random() - 0.5) * 1.0,
    ec: 1.0 + (Math.random() - 0.5) * 0.8,
    temperature: 22 + (Math.random() - 0.5) * 4,
    humidity: 60 + (Math.random() - 0.5) * 20,
    timestamp: new Date().toISOString()
  };
  job.analysis = {
    soilHealth: 75,
    recommendations: ['✅ pH nella norma', '✅ EC nella norma', '✅ Temperatura ottimale'],
    alerts: []
  };
  job.updatedAt = new Date().toISOString();
  jobs[jobId] = job;

  res.json({
    success: true,
    data: {
      jobId: jobId,
      sensorData: job.sensorData,
      analysis: job.analysis
    },
    message: 'Monitoraggio in esecuzione'
  });
});

// Deliver report
app.post('/api/robot/agricolo/deliver', (req, res) => {
  const { jobId } = req.body;
  const job = jobs[jobId];
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  job.status = 'delivered';
  job.report = {
    id: jobId,
    gardenId: job.gardenId,
    generatedAt: new Date().toISOString(),
    summary: '📊 Report Orto: Tutti i parametri nella norma',
    recommendations: ['✅ Continua così!', '📈 Monitora regolarmente'],
    healthScore: '🟢 Ottima'
  };
  job.updatedAt = new Date().toISOString();
  jobs[jobId] = job;

  res.json({
    success: true,
    data: {
      jobId: jobId,
      report: job.report,
      payment: {
        robot: 98,
        platform: 2
      }
    },
    message: 'Report consegnato con successo'
  });
});

app.listen(PORT, () => {
  console.log(`🤖 AgricoloBot TEST avviato sulla porta ${PORT}`);
  console.log(`📡 Endpoint disponibili:`);
  console.log(`  GET  /api/robot/agricolo/health`);
  console.log(`  POST /api/robot/agricolo/assign`);
  console.log(`  GET  /api/robot/agricolo/status/:id`);
  console.log(`  POST /api/robot/agricolo/execute`);
  console.log(`  POST /api/robot/agricolo/deliver`);
});

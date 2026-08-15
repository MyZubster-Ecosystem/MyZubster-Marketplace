/**
 * MyZubster Gateway - API per robot e pagamenti
 * Porta: 5002
 */

const express = require('express');
const app = express();
app.use(express.json());

const PORT = 5003;

// Endpoint per robot - riceve job
app.post('/api/robot/assign', (req, res) => {
  const { robotId, jobId, clientId, amount, currency, description, location } = req.body;
  
  if (!robotId || !jobId || !clientId || !amount) {
    return res.status(400).json({ 
      error: 'robotId, jobId, clientId and amount are required' 
    });
  }

  // Crea un job nel sistema
  const job = {
    id: jobId,
    robotId,
    clientId,
    amount,
    currency: currency || 'MYZ',
    description: description || 'Pulizia urbana',
    location: location || 'Rimini',
    status: 'assigned',
    createdAt: new Date().toISOString()
  };

  console.log(`✅ Job assegnato: ${jobId} a ${robotId}`);

  res.json({
    success: true,
    message: 'Job assegnato con successo',
    job
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    gateway: 'MyZubster Gateway',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚪 MyZubster Gateway avviato sulla porta ${PORT}`);
  console.log(`📡 Endpoint: /api/robot/assign`);
  console.log(`🔍 Health: /api/health`);
});

module.exports = app;

/**
 * PuliziaBot - MyZubster Robot per Nettezza Urbana
 * 
 * Monitora rifiuti e pianifica interventi di pulizia.
 */

const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.CLEANING_PORT || 5011;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:5002';

// Rifiuti segnalati
const reports = [];

app.post('/api/cleaning/report', async (req, res) => {
  const { lat, lng, type, description } = req.body;
  
  reports.push({ lat, lng, type, description, reportedAt: new Date() });
  
  // Se ci sono più di 3 segnalazioni, crea un lavoro
  if (reports.length >= 3) {
    const job = await axios.post(`${GATEWAY_URL}/api/robot/assign`, {
      robotId: 'cleaning-001',
      jobId: `cleaning-${Date.now()}`,
      clientId: 'comune-rimini',
      amount: 100,
      currency: 'MYZ'
    });
    
    res.json({
      success: true,
      message: 'Intervento di pulizia pianificato',
      jobId: job.data.jobId,
      reports: reports.length
    });
  }
  
  res.json({ success: true, message: 'Segnalazione ricevuta' });
});

app.listen(PORT, () => {
  console.log(`🧹 PuliziaBot avviato sulla porta ${PORT}`);
});

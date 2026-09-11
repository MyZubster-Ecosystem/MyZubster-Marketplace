/**
 * RicicloBot - MyZubster Robot per Raccolta Differenziata
 * 
 * Monitora i contenitori e ottimizza i percorsi di raccolta.
 */

const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.RECYCLING_PORT || 5010;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:5002';

app.post('/api/recycling/check', async (req, res) => {
  const { containerId, fillLevel } = req.body;
  
  if (fillLevel > 80) {
    // Crea un job di raccolta
    const job = await axios.post(`${GATEWAY_URL}/api/robot/assign`, {
      robotId: 'recycling-001',
      jobId: `recycling-${Date.now()}`,
      clientId: 'comune-rimini',
      amount: 50,
      currency: 'MYZ'
    });
    
    res.json({
      success: true,
      message: `Contenitore ${containerId} da svuotare`,
      jobId: job.data.jobId
    });
  }
  
  res.json({ success: true, message: 'Monitoraggio attivo' });
});

app.listen(PORT, () => {
  console.log(`♻️ RicicloBot avviato sulla porta ${PORT}`);
});

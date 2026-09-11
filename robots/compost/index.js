/**
 * CompostBot - MyZubster Robot per Compostaggio
 * 
 * Monitora il compostaggio negli orti urbani.
 */

const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.COMPOST_PORT || 5012;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:5002';

// Dati di compostaggio
let compostData = { total: 0, daily: 0 };

app.post('/api/compost/track', async (req, res) => {
  const { gardenId, weight, type } = req.body;
  
  compostData.total += weight;
  compostData.daily += weight;
  
  // Ogni 10 kg di compost, paga il robot
  if (compostData.daily >= 10) {
    const job = await axios.post(`${GATEWAY_URL}/api/robot/assign`, {
      robotId: 'compost-001',
      jobId: `compost-${Date.now()}`,
      clientId: 'comune-rimini',
      amount: 30,
      currency: 'MYZ'
    });
    
    compostData.daily = 0;
    
    res.json({
      success: true,
      message: 'Pagamento per compostaggio attivato',
      jobId: job.data.jobId,
      totalCompost: compostData.total
    });
  }
  
  res.json({ 
    success: true, 
    totalCompost: compostData.total,
    dailyCompost: compostData.daily 
  });
});

app.listen(PORT, () => {
  console.log(`🌱 CompostBot avviato sulla porta ${PORT}`);
});

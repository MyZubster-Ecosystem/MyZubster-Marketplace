/*
 * Simulatore Arduino per test
 * Invia dati finti al backend ogni 5 secondi
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000/api/sensors/data';
const GARDEN_ID = '6a6c7cc43c87dff77383039a'; // Usa l'ID del tuo orto

function generateSensorData() {
  return {
    gardenId: GARDEN_ID,
    ph: 6.5 + (Math.random() - 0.5) * 1.0, // 6.0 - 7.0
    ec: 1.0 + (Math.random() - 0.5) * 0.8, // 0.6 - 1.4
    temperature: 22 + (Math.random() - 0.5) * 4, // 20 - 24
    humidity: 60 + (Math.random() - 0.5) * 20, // 50 - 70
    timestamp: new Date()
  };
}

async function sendData() {
  const data = generateSensorData();
  try {
    const response = await axios.post(API_URL, data);
    console.log('✅ Dati inviati:', data);
    console.log('📊 Risposta:', response.data);
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

// Invia dati ogni 5 secondi
setInterval(sendData, 5000);

console.log('🚀 Simulatore Arduino avviato!');
console.log(`📡 Inviando dati per gardenId: ${GARDEN_ID}`);
console.log('⏱️  Invio ogni 5 secondi...');
console.log('Premi Ctrl+C per fermare');

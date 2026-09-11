/**
 * Integrazione con i sensori Arduino
 * Legge i dati dai sensori del suolo
 */

const axios = require('axios');

class SensorIntegrator {
  constructor() {
    this.marketplaceUrl = process.env.MARKETPLACE_URL || 'http://localhost:4000';
  }

  // Leggi i dati dai sensori
  async readSensors(gardenId = '6a6c7cc43c87dff77383039a') {
    try {
      const response = await axios.get(
        `${this.marketplaceUrl}/api/sensors/garden/${gardenId}/latest`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error reading sensors:', error.message);
      // Dati simulati se il marketplace non è disponibile
      return this.generateMockData();
    }
  }

  // Leggi lo storico
  async readHistory(gardenId, limit = 10) {
    try {
      const response = await axios.get(
        `${this.marketplaceUrl}/api/sensors/garden/${gardenId}?limit=${limit}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error reading history:', error.message);
      return [];
    }
  }

  // Genera dati simulati
  generateMockData() {
    return {
      ph: 6.5 + (Math.random() - 0.5) * 1.0,
      ec: 1.0 + (Math.random() - 0.5) * 0.8,
      temperature: 22 + (Math.random() - 0.5) * 4,
      humidity: 60 + (Math.random() - 0.5) * 20,
      timestamp: new Date().toISOString()
    };
  }

  // Analizza i dati e produce raccomandazioni
  analyzeData(sensorData) {
    const analysis = {
      soilHealth: 0,
      recommendations: [],
      alerts: [],
      needsWater: false
    };

    if (sensorData.ph) {
      if (sensorData.ph < 5.5) {
        analysis.alerts.push('⚠️ pH troppo acido');
        analysis.recommendations.push('Aggiungi calce');
      } else if (sensorData.ph > 7.5) {
        analysis.alerts.push('⚠️ pH troppo alcalino');
        analysis.recommendations.push('Aggiungi zolfo');
      }
    }

    if (sensorData.humidity && sensorData.humidity < 40) {
      analysis.needsWater = true;
      analysis.recommendations.push('💧 Irrigazione necessaria');
    }

    if (sensorData.temperature && sensorData.temperature > 30) {
      analysis.recommendations.push('☀️ Ombreggiamento consigliato');
    }

    // Calcola punteggio salute del suolo
    let score = 0;
    let total = 0;
    
    if (sensorData.ph) {
      score += (sensorData.ph >= 5.5 && sensorData.ph <= 7.5) ? 25 : 0;
      total += 25;
    }
    if (sensorData.ec) {
      score += (sensorData.ec >= 0.5 && sensorData.ec <= 2.0) ? 25 : 0;
      total += 25;
    }
    if (sensorData.temperature) {
      score += (sensorData.temperature >= 10 && sensorData.temperature <= 35) ? 25 : 0;
      total += 25;
    }
    if (sensorData.humidity) {
      score += (sensorData.humidity >= 30 && sensorData.humidity <= 80) ? 25 : 0;
      total += 25;
    }

    analysis.soilHealth = total > 0 ? Math.round((score / total) * 100) : 0;

    return analysis;
  }
}

module.exports = new SensorIntegrator();

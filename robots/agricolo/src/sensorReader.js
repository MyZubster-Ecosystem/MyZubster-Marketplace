/**
 * Lettura dei dati dai sensori per il robot
 */

const axios = require('axios');

class SensorReader {
  constructor() {
    this.marketplaceUrl = process.env.MARKETPLACE_URL || 'http://localhost:4000';
  }

  async readData(jobId) {
    try {
      // Recupera i dati del job per ottenere il gardenId
      const jobResponse = await axios.get(`${this.marketplaceUrl}/api/robot/agricolo/status/${jobId}`);
      const gardenId = jobResponse.data.data.gardenId;

      // Leggi l'ultima lettura dai sensori
      const response = await axios.get(
        `${this.marketplaceUrl}/api/sensors/garden/${gardenId}/latest`
      );

      return response.data.data;
    } catch (error) {
      console.error('Error reading sensor data:', error.message);
      
      // Se non ci sono dati reali, usa dati simulati
      return this.generateMockData();
    }
  }

  generateMockData() {
    return {
      ph: 6.5 + (Math.random() - 0.5) * 1.0,
      ec: 1.0 + (Math.random() - 0.5) * 0.8,
      temperature: 22 + (Math.random() - 0.5) * 4,
      humidity: 60 + (Math.random() - 0.5) * 20,
      timestamp: new Date().toISOString()
    };
  }

  async readHistory(gardenId, limit = 10) {
    try {
      const response = await axios.get(
        `${this.marketplaceUrl}/api/sensors/garden/${gardenId}?limit=${limit}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error reading sensor history:', error.message);
      return [];
    }
  }

  async getStats(gardenId) {
    try {
      const response = await axios.get(
        `${this.marketplaceUrl}/api/sensors/garden/${gardenId}/stats`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error getting sensor stats:', error.message);
      return null;
    }
  }
}

module.exports = new SensorReader();

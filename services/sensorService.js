const SensorData = require('../models/SensorData');

class SensorService {
  async saveSensorData(gardenId, data) {
    try {
      const sensorData = new SensorData({
        gardenId,
        ph: data.ph,
        ec: data.ec,
        temperature: data.temperature,
        humidity: data.humidity,
        timestamp: data.timestamp || new Date()
      });
      return await sensorData.save();
    } catch (error) {
      console.error('Error saving sensor data:', error);
      throw error;
    }
  }

  async getGardenHistory(gardenId, limit = 100) {
    try {
      return await SensorData.find({ gardenId })
        .sort({ timestamp: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  }

  async getLatestReading(gardenId) {
    try {
      return await SensorData.findOne({ gardenId })
        .sort({ timestamp: -1 });
    } catch (error) {
      console.error('Error fetching latest:', error);
      throw error;
    }
  }

  async calculateStats(gardenId) {
    try {
      const readings = await SensorData.find({ gardenId })
        .sort({ timestamp: -1 })
        .limit(50);

      if (readings.length === 0) return null;

      const stats = {
        totalReadings: readings.length,
        ph: { avg: 0, min: Infinity, max: -Infinity },
        ec: { avg: 0, min: Infinity, max: -Infinity },
        temperature: { avg: 0, min: Infinity, max: -Infinity },
        humidity: { avg: 0, min: Infinity, max: -Infinity }
      };

      readings.forEach(r => {
        ['ph', 'ec', 'temperature', 'humidity'].forEach(key => {
          if (r[key] !== undefined && r[key] !== null) {
            stats[key].avg += r[key];
            if (r[key] < stats[key].min) stats[key].min = r[key];
            if (r[key] > stats[key].max) stats[key].max = r[key];
          }
        });
      });

      ['ph', 'ec', 'temperature', 'humidity'].forEach(key => {
        stats[key].avg = stats[key].avg / readings.length;
        if (stats[key].min === Infinity) stats[key].min = 0;
        if (stats[key].max === -Infinity) stats[key].max = 0;
      });

      return stats;
    } catch (error) {
      console.error('Error calculating stats:', error);
      throw error;
    }
  }

  async deleteReading(id) {
    try {
      return await SensorData.findByIdAndDelete(id);
    } catch (error) {
      console.error('Error deleting reading:', error);
      throw error;
    }
  }
}

module.exports = new SensorService();

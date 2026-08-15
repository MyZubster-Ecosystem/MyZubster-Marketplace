/**
 * EVA IONI 2.0 - Environmental Sensors Module
 * Sensori ambientali supplementari per monitoraggio completo
 */

const EventEmitter = require('events');

class EnvironmentalSensor extends EventEmitter {
  constructor() {
    super();
    this.sensors = {
      airQuality: {
        pm25: 0,
        pm10: 0,
        co2: 0,
        voc: 0
      },
      weather: {
        temperature: 22,
        humidity: 60,
        windSpeed: 0,
        rain: false,
        uvIndex: 0
      },
      acoustic: {
        level: 0,
        birdSongs: 0,
        noisePollution: 0
      },
      light: {
        par: 0,
        lux: 0
      }
    };
    this.history = [];
    this.updateInterval = null;
  }

  startMonitoring(interval = 5000) {
    this.updateInterval = setInterval(() => {
      this.readAllSensors();
    }, interval);
    console.log('🌍 Environmental sensors started');
  }

  stopMonitoring() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('🌍 Environmental sensors stopped');
  }

  readAllSensors() {
    // Simula lettura sensori
    this.sensors.airQuality = {
      pm25: 5 + Math.random() * 10,
      pm10: 10 + Math.random() * 20,
      co2: 400 + Math.random() * 200,
      voc: 0.1 + Math.random() * 0.5
    };

    this.sensors.weather = {
      temperature: 18 + Math.random() * 14,
      humidity: 40 + Math.random() * 40,
      windSpeed: Math.random() * 10,
      rain: Math.random() > 0.8,
      uvIndex: Math.floor(Math.random() * 11)
    };

    this.sensors.acoustic = {
      level: 30 + Math.random() * 30,
      birdSongs: Math.floor(Math.random() * 20),
      noisePollution: Math.random() * 10
    };

    this.sensors.light = {
      par: 100 + Math.random() * 800,
      lux: 1000 + Math.random() * 8000
    };

    this.history.push({
      timestamp: new Date().toISOString(),
      ...this.sensors
    });

    this.emit('sensor-data', this.sensors);
    this.emit('air-quality', this.sensors.airQuality);
    this.emit('weather', this.sensors.weather);
    this.emit('acoustic', this.sensors.acoustic);
    this.emit('light', this.sensors.light);

    return this.sensors;
  }

  getCurrentData() {
    return {
      timestamp: new Date().toISOString(),
      ...this.sensors
    };
  }

  getHistory(limit = 100) {
    return this.history.slice(-limit);
  }

  getAirQuality() {
    const aq = this.sensors.airQuality;
    let quality = 'good';
    if (aq.pm25 > 35 || aq.pm10 > 50) quality = 'moderate';
    if (aq.pm25 > 55 || aq.pm10 > 150) quality = 'unhealthy';
    if (aq.pm25 > 150 || aq.pm10 > 250) quality = 'hazardous';
    return { ...aq, quality };
  }

  getWeatherForecast() {
    const weather = this.sensors.weather;
    let forecast = 'clear';
    if (weather.rain) forecast = 'rainy';
    if (weather.windSpeed > 30) forecast = 'windy';
    if (weather.temperature > 30) forecast = 'hot';
    if (weather.temperature < 5) forecast = 'cold';
    return { ...weather, forecast };
  }

  getBiodiversityScore() {
    const birds = this.sensors.acoustic.birdSongs;
    const noise = this.sensors.acoustic.noisePollution;
    const uv = this.sensors.weather.uvIndex;
    
    let score = 50;
    score += birds * 2;
    score -= noise * 2;
    score -= Math.max(0, uv - 5) * 3;
    
    return Math.max(0, Math.min(100, score));
  }

  async calibrateSensors() {
    // Simula calibrazione
    console.log('🔧 Calibrating environmental sensors...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Sensors calibrated successfully');
    return { success: true, message: 'Calibration complete' };
  }
}

module.exports = new EnvironmentalSensor();

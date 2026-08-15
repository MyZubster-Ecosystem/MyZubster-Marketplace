class IotSensorService {
  constructor() {
    this.sensors = [];
    this.readings = [];
  }

  // Registra un sensore
  registerSensor(data) {
    const sensor = {
      id: `SENSOR-${Date.now()}`,
      name: data.name,
      type: data.type || 'generic',
      gardenId: data.gardenId,
      status: 'active',
      lastReading: null,
      createdAt: new Date()
    };
    this.sensors.push(sensor);
    return sensor;
  }

  // Simula lettura sensore
  simulateReading(sensorId) {
    const sensor = this.sensors.find(s => s.id === sensorId);
    if (!sensor) return null;

    const reading = {
      sensorId,
      temperature: 15 + Math.random() * 15,
      humidity: 40 + Math.random() * 40,
      ph: 6 + Math.random() * 2,
      ec: 0.5 + Math.random() * 1.5,
      timestamp: new Date()
    };

    sensor.lastReading = reading;
    this.readings.push(reading);
    return reading;
  }

  // Ottieni dati
  getLatestReadings(gardenId) {
    return this.readings
      .filter(r => {
        const sensor = this.sensors.find(s => s.id === r.sensorId);
        return sensor && sensor.gardenId === gardenId;
      })
      .slice(-10);
  }

  getStats() {
    return {
      total: this.sensors.length,
      active: this.sensors.filter(s => s.status === 'active').length,
      readings: this.readings.length
    };
  }
}

module.exports = new IotSensorService();

/**
 * Arduino Sensor Reader (#21)
 * Reads serial data from Arduino sensors (pH, EC, temperature, humidity)
 * and sends it to the MyZubster Gateway API.
 */
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const config = require('./config');
const { sendSensorData } = require('./apiClient');

class SensorReader {
  constructor(portName, baudRate) {
    this.portName = portName || config.serial.port;
    this.baudRate = baudRate || config.serial.baudRate;
    this.port = null;
    this.parser = null;
    this.isConnected = false;
    this.readings = { ph: null, ec: null, temperature: null, humidity: null, soilMoisture: null };
    this.intervalId = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.port = new SerialPort(this.portName, { baudRate: this.baudRate }, (err) => {
        if (err) {
          console.error(`Failed to open serial port ${this.portName}:`, err.message);
          reject(err);
          return;
        }
        console.log(`Connected to Arduino on ${this.portName} @ ${this.baudRate} baud`);
        this.isConnected = true;
        this.parser = this.port.pipe(new Readline({ delimiter: '\n' }));
        this.parser.on('data', (data) => this.processData(data));
        this.parser.on('error', (err) => console.error('Parser error:', err));
        resolve();
      });
    });
  }

  processData(rawData) {
    try {
      // Expected format from Arduino: "ph:7.2,ec:1.5,temp:22.5,hum:65,moist:45"
      const trimmed = rawData.trim();
      if (trimmed.startsWith('{')) {
        // JSON format
        const data = JSON.parse(trimmed);
        this.readings = {
          ph: data.ph !== undefined ? this.calibrate('ph', data.ph) : this.readings.ph,
          ec: data.ec !== undefined ? this.calibrate('ec', data.ec) : this.readings.ec,
          temperature: data.temp !== undefined ? data.temp : this.readings.temperature,
          humidity: data.hum !== undefined ? data.hum : this.readings.humidity,
          soilMoisture: data.moist !== undefined ? data.moist : this.readings.soilMoisture
        };
      } else if (trimmed.includes(':')) {
        // CSV format: "ph:7.2,ec:1.5,temp:22.5,hum:65,moist:45"
        const pairs = trimmed.split(',');
        for (const pair of pairs) {
          const [key, value] = pair.split(':');
          const numValue = parseFloat(value);
          if (isNaN(numValue)) continue;
          switch (key.trim().toLowerCase()) {
            case 'ph': this.readings.ph = this.calibrate('ph', numValue); break;
            case 'ec': this.readings.ec = this.calibrate('ec', numValue); break;
            case 'temp': case 'temperature': this.readings.temperature = numValue; break;
            case 'hum': case 'humidity': this.readings.humidity = numValue; break;
            case 'moist': case 'soilmoisture': this.readings.soilMoisture = numValue; break;
          }
        }
      }
      console.log('Sensor readings:', this.readings);
    } catch (e) {
      console.error('Error parsing sensor data:', e.message, 'Raw:', rawData);
    }
  }

  calibrate(sensor, rawValue) {
    const cal = config.calibration[sensor];
    if (!cal) return rawValue;
    return (rawValue - cal.offset) * cal.slope;
  }

  async sendToGateway() {
    if (!this.isConnected) {
      console.warn('Not connected to Arduino, skipping send');
      return;
    }
    try {
      const result = await sendSensorData(this.readings);
      console.log('Data sent to gateway:', result);
    } catch (e) {
      console.error('Failed to send data to gateway:', e.message);
    }
  }

  start(intervalMs) {
    if (!this.isConnected) {
      console.error('Not connected. Call connect() first.');
      return;
    }
    const interval = intervalMs || config.api.sendIntervalMs;
    console.log(`Starting auto-send every ${interval / 1000}s`);
    this.intervalId = setInterval(() => this.sendToGateway(), interval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Auto-send stopped');
    }
  }

  disconnect() {
    this.stop();
    if (this.port && this.port.isOpen) {
      this.port.close();
      this.isConnected = false;
      console.log('Disconnected from Arduino');
    }
  }

  getReadings() {
    return { ...this.readings, timestamp: new Date().toISOString() };
  }
}

module.exports = SensorReader;

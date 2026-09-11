/**
 * API Client for MyZubster Gateway (#21)
 * Sends sensor readings to the MyZubster Gateway API.
 */
const axios = require('axios');
const config = require('./config');

const client = axios.create({
  baseURL: config.api.baseUrl,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

let authToken = null;

function setAuthToken(token) {
  authToken = token;
  client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

async function sendSensorData(readings) {
  if (!authToken) throw new Error('No auth token set. Call setAuthToken() first.');
  const payload = {
    gardenId: config.garden.id,
    gardenName: config.garden.name,
    sensors: {
      temperature: readings.temperature,
      humidity: readings.humidity,
      ph: readings.ph,
      soilMoisture: readings.soilMoisture,
      ec: readings.ec
    },
    timestamp: new Date().toISOString()
  };
  const response = await client.put(`/api/marketplace/dashboard/${config.garden.id}`, payload);
  return response.data;
}

async function sendRawData(rawReadings) {
  return sendSensorData({
    temperature: rawReadings.temp || null,
    humidity: rawReadings.hum || null,
    ph: rawReadings.ph || null,
    soilMoisture: rawReadings.moist || null,
    ec: rawReadings.ec || null
  });
}

async function getGardenStats() {
  if (!authToken) throw new Error('No auth token set');
  const response = await client.get(`/api/marketplace/dashboard/${config.garden.id}`);
  return response.data;
}

async function login(username, password) {
  const response = await client.post('/api/auth/login', { username, password });
  if (response.data.token) setAuthToken(response.data.token);
  return response.data;
}

module.exports = { setAuthToken, sendSensorData, sendRawData, getGardenStats, login };

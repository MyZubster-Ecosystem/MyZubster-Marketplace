const Antenna = require('../models/Antenna');

class AntennaService {
  constructor() {
    this.antennas = new Map(); // Cache in-memory
  }

  async registerAntenna(data) {
    try {
      const antenna = new Antenna(data);
      await antenna.save();
      this.antennas.set(antenna.antennaId, antenna);
      return antenna;
    } catch (error) {
      throw new Error(`Failed to register antenna: ${error.message}`);
    }
  }

  async getAntenna(antennaId) {
    try {
      return await Antenna.findOne({ antennaId });
    } catch (error) {
      throw new Error(`Failed to get antenna: ${error.message}`);
    }
  }

  async updateStatus(antennaId, status) {
    try {
      const antenna = await Antenna.findOne({ antennaId });
      if (!antenna) {
        throw new Error('Antenna not found');
      }
      antenna.status = status;
      antenna.lastPing = new Date();
      await antenna.save();
      this.antennas.set(antennaId, antenna);
      return antenna;
    } catch (error) {
      throw new Error(`Failed to update antenna status: ${error.message}`);
    }
  }

  async getAllAntennas() {
    try {
      return await Antenna.find({ status: 'active' });
    } catch (error) {
      throw new Error(`Failed to get antennas: ${error.message}`);
    }
  }

  async sendCommand(antennaId, command, data) {
    try {
      // In produzione: invia comando via MQTT/WebSocket
      console.log(`📡 Sending command to ${antennaId}: ${command}`, data);
      return { success: true, command, antennaId, data };
    } catch (error) {
      throw new Error(`Failed to send command: ${error.message}`);
    }
  }
}

module.exports = new AntennaService();

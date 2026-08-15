/**
 * Integrazione con il sistema di escrow di MyZubster
 */

const axios = require('axios');

class EscrowIntegration {
  constructor() {
    this.gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:4000';
  }

  async initEscrow(data) {
    try {
      const response = await axios.post(`${this.gatewayUrl}/api/escrow/create`, {
        jobId: data.jobId,
        wallet: data.wallet,
        amount: data.amount,
        type: 'robot_service',
        description: 'AgricoloBot - Monitoring Service'
      });
      return response.data;
    } catch (error) {
      console.error('Error initializing escrow:', error.message);
      throw error;
    }
  }

  async releaseEscrow(data) {
    try {
      const response = await axios.post(`${this.gatewayUrl}/api/escrow/release`, {
        jobId: data.jobId,
        robotWallet: data.robotWallet,
        platformWallet: data.platformWallet,
        amount: data.amount,
        fee: data.fee
      });
      return response.data;
    } catch (error) {
      console.error('Error releasing escrow:', error.message);
      throw error;
    }
  }

  async cancelEscrow(jobId) {
    try {
      const response = await axios.post(`${this.gatewayUrl}/api/escrow/cancel`, {
        jobId
      });
      return response.data;
    } catch (error) {
      console.error('Error canceling escrow:', error.message);
      throw error;
    }
  }

  async getEscrowStatus(jobId) {
    try {
      const response = await axios.get(`${this.gatewayUrl}/api/escrow/status/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting escrow status:', error.message);
      throw error;
    }
  }
}

module.exports = new EscrowIntegration();

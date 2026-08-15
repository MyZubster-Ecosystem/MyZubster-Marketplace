/**
 * AgricoloBot - Logica principale del robot
 */

const mongoose = require('mongoose');

// Schema per i lavori del robot
const jobSchema = new mongoose.Schema({
  gardenId: {
    type: String,
    required: true,
    index: true
  },
  wallet: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true // in giorni
  },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'completed', 'delivered', 'disputed'],
    default: 'assigned'
  },
  sensorData: {
    type: Array,
    default: []
  },
  analysis: {
    type: Object,
    default: null
  },
  report: {
    type: Object,
    default: null
  },
  escrowId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Job = mongoose.model('AgricoloJob', jobSchema);

class AgricoloBot {
  async createJob(data) {
    const job = new Job(data);
    return await job.save();
  }

  async getJob(id) {
    return await Job.findById(id);
  }

  async updateJob(id, data) {
    data.updatedAt = new Date();
    return await Job.findByIdAndUpdate(id, data, { new: true });
  }

  async analyzeData(sensorData) {
    // Analizza i dati dai sensori
    const analysis = {
      soilHealth: this.calculateSoilHealth(sensorData),
      recommendations: [],
      alerts: []
    };

    // pH analysis
    if (sensorData.ph) {
      if (sensorData.ph < 5.5) {
        analysis.alerts.push('⚠️ pH troppo acido (< 5.5). Aggiungi calce.');
        analysis.recommendations.push('Aggiungi calce per aumentare il pH.');
      } else if (sensorData.ph > 7.5) {
        analysis.alerts.push('⚠️ pH troppo alcalino (> 7.5). Aggiungi zolfo.');
        analysis.recommendations.push('Aggiungi zolfo per abbassare il pH.');
      } else {
        analysis.recommendations.push('✅ pH nella norma (5.5-7.5).');
      }
    }

    // EC analysis
    if (sensorData.ec) {
      if (sensorData.ec < 0.5) {
        analysis.alerts.push('⚠️ EC troppo bassa (< 0.5). Aggiungi fertilizzante.');
        analysis.recommendations.push('Aggiungi fertilizzante per aumentare la conducibilità.');
      } else if (sensorData.ec > 2.0) {
        analysis.alerts.push('⚠️ EC troppo alta (> 2.0). Riduci fertilizzante.');
        analysis.recommendations.push('Riduci il fertilizzante per abbassare la conducibilità.');
      } else {
        analysis.recommendations.push('✅ EC nella norma (0.5-2.0).');
      }
    }

    // Temperature analysis
    if (sensorData.temperature) {
      if (sensorData.temperature < 10) {
        analysis.alerts.push('⚠️ Temperatura troppo bassa (< 10°C).');
        analysis.recommendations.push('Proteggi le piante dal freddo.');
      } else if (sensorData.temperature > 35) {
        analysis.alerts.push('⚠️ Temperatura troppo alta (> 35°C).');
        analysis.recommendations.push('Irriga e ombreggia le piante.');
      } else {
        analysis.recommendations.push('✅ Temperatura nella norma.');
      }
    }

    // Humidity analysis
    if (sensorData.humidity) {
      if (sensorData.humidity < 30) {
        analysis.alerts.push('⚠️ Umidità troppo bassa (< 30%).');
        analysis.recommendations.push('Aumenta l\'irrigazione.');
      } else if (sensorData.humidity > 80) {
        analysis.alerts.push('⚠️ Umidità troppo alta (> 80%).');
        analysis.recommendations.push('Riduci l\'irrigazione e aumenta il drenaggio.');
      } else {
        analysis.recommendations.push('✅ Umidità nella norma.');
      }
    }

    return analysis;
  }

  calculateSoilHealth(sensorData) {
    let score = 0;
    let maxScore = 0;

    if (sensorData.ph) {
      score += sensorData.ph >= 5.5 && sensorData.ph <= 7.5 ? 25 : 0;
      maxScore += 25;
    }

    if (sensorData.ec) {
      score += sensorData.ec >= 0.5 && sensorData.ec <= 2.0 ? 25 : 0;
      maxScore += 25;
    }

    if (sensorData.temperature) {
      score += sensorData.temperature >= 10 && sensorData.temperature <= 35 ? 25 : 0;
      maxScore += 25;
    }

    if (sensorData.humidity) {
      score += sensorData.humidity >= 30 && sensorData.humidity <= 80 ? 25 : 0;
      maxScore += 25;
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  async deliverReport(jobId, report) {
    const job = await this.updateJob(jobId, {
      report,
      status: 'delivered'
    });
    return job;
  }
}

module.exports = new AgricoloBot();

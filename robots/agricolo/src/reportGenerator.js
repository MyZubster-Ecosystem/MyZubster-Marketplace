/**
 * Generazione di report per il robot
 */

const axios = require('axios');
const sensorReader = require('./sensorReader');
const agricoloBot = require('./agricoloBot');

class ReportGenerator {
  async generate(jobId) {
    try {
      // Recupera il job
      const job = await agricoloBot.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Recupera lo storico dei dati
      const history = await sensorReader.readHistory(job.gardenId, 30);
      
      // Recupera le statistiche
      const stats = await sensorReader.getStats(job.gardenId);

      // Genera il report
      const report = {
        id: jobId,
        gardenId: job.gardenId,
        generatedAt: new Date().toISOString(),
        summary: this.generateSummary(history, stats),
        data: history,
        statistics: stats,
        recommendations: this.generateRecommendations(stats),
        trends: this.analyzeTrends(history),
        healthScore: this.calculateOverallHealth(history)
      };

      return report;
    } catch (error) {
      console.error('Error generating report:', error.message);
      throw error;
    }
  }

  generateSummary(history, stats) {
    if (!history || history.length === 0) {
      return 'Nessun dato disponibile per questo orto.';
    }

    const lastReading = history[0];
    return `📊 Report Orto ${lastReading.gardenId || 'non specificato'}
    
📈 Ultima lettura (${new Date(lastReading.timestamp).toLocaleDateString('it-IT')}):
  • pH: ${lastReading.ph?.toFixed(2) || 'N/A'}
  • EC: ${lastReading.ec?.toFixed(2) || 'N/A'} mS/cm
  • Temperatura: ${lastReading.temperature?.toFixed(1) || 'N/A'}°C
  • Umidità: ${lastReading.humidity?.toFixed(1) || 'N/A'}%

📊 Statistiche (ultimi ${history.length} giorni):
  • pH medio: ${stats?.ph?.avg?.toFixed(2) || 'N/A'}
  • EC media: ${stats?.ec?.avg?.toFixed(2) || 'N/A'} mS/cm
  • Temperatura media: ${stats?.temperature?.avg?.toFixed(1) || 'N/A'}°C
  • Umidità media: ${stats?.humidity?.avg?.toFixed(1) || 'N/A'}%`;
  }

  generateRecommendations(stats) {
    const recommendations = [];

    if (!stats) {
      recommendations.push('🔍 Attendi dati sufficienti per raccomandazioni personalizzate.');
      return recommendations;
    }

    if (stats.ph) {
      if (stats.ph.avg < 5.5) {
        recommendations.push('🌱 Aggiungi calce per aumentare il pH del suolo.');
      } else if (stats.ph.avg > 7.5) {
        recommendations.push('🌱 Aggiungi zolfo per abbassare il pH del suolo.');
      } else {
        recommendations.push('✅ pH del suolo ottimale.');
      }
    }

    if (stats.ec) {
      if (stats.ec.avg < 0.5) {
        recommendations.push('💧 Aggiungi fertilizzante per aumentare la conducibilità.');
      } else if (stats.ec.avg > 2.0) {
        recommendations.push('💧 Riduci il fertilizzante per abbassare la conducibilità.');
      } else {
        recommendations.push('✅ Conducibilità ottimale.');
      }
    }

    if (stats.temperature) {
      if (stats.temperature.avg < 10) {
        recommendations.push('❄️ Proteggi le piante dal freddo.');
      } else if (stats.temperature.avg > 35) {
        recommendations.push('☀️ Irriga e ombreggia le piante.');
      } else {
        recommendations.push('✅ Temperatura ottimale.');
      }
    }

    if (stats.humidity) {
      if (stats.humidity.avg < 30) {
        recommendations.push('💦 Aumenta l\'irrigazione.');
      } else if (stats.humidity.avg > 80) {
        recommendations.push('💦 Riduci l\'irrigazione e aumenta il drenaggio.');
      } else {
        recommendations.push('✅ Umidità ottimale.');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Tutti i parametri sono nella norma. Continua così!');
    }

    return recommendations;
  }

  analyzeTrends(history) {
    if (!history || history.length < 5) {
      return {
        pH: 'Dati insufficienti per analizzare trend',
        temperature: 'Dati insufficienti per analizzare trend',
        humidity: 'Dati insufficienti per analizzare trend'
      };
    }

    const pHValues = history.map(h => h.ph).filter(v => v !== undefined);
    const tempValues = history.map(h => h.temperature).filter(v => v !== undefined);
    const humValues = history.map(h => h.humidity).filter(v => v !== undefined);

    return {
      pH: this.calculateTrend(pHValues),
      temperature: this.calculateTrend(tempValues),
      humidity: this.calculateTrend(humValues)
    };
  }

  calculateTrend(values) {
    if (values.length < 3) return 'Dati insufficienti';
    
    const firstHalf = values.slice(0, Math.floor(values.length/2));
    const secondHalf = values.slice(Math.floor(values.length/2));
    
    const firstAvg = firstHalf.reduce((a,b) => a+b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a,b) => a+b, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    const percentChange = (diff / firstAvg) * 100;
    
    if (Math.abs(percentChange) < 5) {
      return '📊 Stabile';
    } else if (percentChange > 0) {
      return `📈 In aumento (${percentChange.toFixed(1)}%)`;
    } else {
      return `📉 In diminuzione (${Math.abs(percentChange).toFixed(1)}%)`;
    }
  }

  calculateOverallHealth(history) {
    if (!history || history.length === 0) return 'N/A';
    
    const lastReading = history[0];
    let score = 0;
    let total = 0;
    
    if (lastReading.ph) {
      score += (lastReading.ph >= 5.5 && lastReading.ph <= 7.5) ? 25 : 0;
      total += 25;
    }
    
    if (lastReading.ec) {
      score += (lastReading.ec >= 0.5 && lastReading.ec <= 2.0) ? 25 : 0;
      total += 25;
    }
    
    if (lastReading.temperature) {
      score += (lastReading.temperature >= 10 && lastReading.temperature <= 35) ? 25 : 0;
      total += 25;
    }
    
    if (lastReading.humidity) {
      score += (lastReading.humidity >= 30 && lastReading.humidity <= 80) ? 25 : 0;
      total += 25;
    }
    
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    
    if (percentage >= 80) return '🟢 Ottima';
    if (percentage >= 60) return '🟡 Buona';
    if (percentage >= 40) return '🟠 Media';
    return '🔴 Critica';
  }
}

module.exports = new ReportGenerator();

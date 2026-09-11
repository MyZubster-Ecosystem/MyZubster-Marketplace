/**
 * EVA IONI 2.0 - AI Recommendations Engine
 * Miglioramento delle raccomandazioni per orti urbani
 */

const EventEmitter = require('events');

class AIRecommendations extends EventEmitter {
  constructor() {
    super();
    this.knowledgeBase = {
      plants: {
        'Pomodoro': { water: 70, sun: 80, soil: 'pH 6.0-6.8', spacing: '60cm' },
        'Basilico': { water: 60, sun: 90, soil: 'pH 6.0-7.0', spacing: '30cm' },
        'Lavanda': { water: 30, sun: 100, soil: 'pH 6.5-7.5', spacing: '45cm' },
        'Rosmarino': { water: 25, sun: 100, soil: 'pH 6.0-7.5', spacing: '40cm' },
        'Girasole': { water: 50, sun: 100, soil: 'pH 6.0-7.5', spacing: '60cm' }
      },
      pests: {
        'Afidi': { treatment: 'Sapone di potassio', prevention: 'Nasturzio' },
        'Oidio': { treatment: 'Zolfo', prevention: 'Bicarbonato' },
        'Mosca bianca': { treatment: 'Olio di neem', prevention: 'Menta' }
      }
    };
    this.plantLog = [];
    this.recommendations = [];
    this.confidence = 0.8;
  }

  // Ottieni raccomandazioni per un orto
  async getRecommendations(gardenData) {
    const recommendations = [];
    const { soilData, weatherData, plantType } = gardenData;

    // Raccomandazioni suolo
    if (soilData) {
      const soilAdvice = this.analyzeSoil(soilData);
      recommendations.push(...soilAdvice);
    }

    // Raccomandazioni meteo
    if (weatherData) {
      const weatherAdvice = this.analyzeWeather(weatherData);
      recommendations.push(...weatherAdvice);
    }

    // Raccomandazioni piante
    if (plantType && this.knowledgeBase.plants[plantType]) {
      const plantAdvice = this.getPlantAdvice(plantType);
      recommendations.push(plantAdvice);
    }

    // Raccomandazioni parassiti
    const pestAdvice = this.checkPests(gardenData);
    if (pestAdvice) {
      recommendations.push(pestAdvice);
    }

    this.recommendations = recommendations;
    this.emit('recommendations-update', recommendations);
    
    return {
      success: true,
      recommendations,
      confidence: this.confidence,
      timestamp: new Date().toISOString()
    };
  }

  // Analisi del suolo
  analyzeSoil(soilData) {
    const advice = [];
    
    if (soilData.ph) {
      if (soilData.ph < 6.0) {
        advice.push({
          type: 'soil',
          title: '⚠️ pH troppo acido',
          action: 'Aggiungi calce per aumentare il pH',
          priority: 'high'
        });
      } else if (soilData.ph > 7.5) {
        advice.push({
          type: 'soil',
          title: '⚠️ pH troppo alcalino',
          action: 'Aggiungi zolfo per abbassare il pH',
          priority: 'high'
        });
      } else {
        advice.push({
          type: 'soil',
          title: '✅ pH ottimale',
          action: 'pH nella norma, continua così!',
          priority: 'low'
        });
      }
    }

    if (soilData.moisture) {
      if (soilData.moisture < 30) {
        advice.push({
          type: 'soil',
          title: '💧 Umidità bassa',
          action: 'Irrigazione consigliata',
          priority: 'medium'
        });
      }
    }

    return advice;
  }

  // Analisi meteo
  analyzeWeather(weatherData) {
    const advice = [];
    
    if (weatherData.temperature > 30) {
      advice.push({
        type: 'weather',
        title: '☀️ Temperature elevate',
        action: 'Irriga e ombreggia le piante',
        priority: 'high'
      });
    }

    if (weatherData.rain) {
      advice.push({
        type: 'weather',
        title: '🌧️ Pioggia prevista',
        action: 'Sospendi l\'irrigazione automatica',
        priority: 'medium'
      });
    }

    return advice;
  }

  // Consigli per le piante
  getPlantAdvice(plantType) {
    const plant = this.knowledgeBase.plants[plantType];
    if (!plant) return null;
    
    return {
      type: 'plant',
      title: `🌱 Consigli per ${plantType}`,
      action: `Acqua: ${plant.water}% • Sole: ${plant.sun}% • Spaziatura: ${plant.spacing}`,
      details: `pH ideale: ${plant.soil}`,
      priority: 'medium'
    };
  }

  // Controllo parassiti
  checkPests(gardenData) {
    // Simula rilevamento parassiti
    const pests = Object.keys(this.knowledgeBase.pests);
    const randomPest = pests[Math.floor(Math.random() * pests.length)];
    
    if (Math.random() > 0.7) {
      const pest = this.knowledgeBase.pests[randomPest];
      return {
        type: 'pest',
        title: `🐛 Rilevato: ${randomPest}`,
        action: `Trattamento: ${pest.treatment}`,
        prevention: `Prevenzione: ${pest.prevention}`,
        priority: 'high'
      };
    }
    return null;
  }

  // Impara dall'esperienza
  learn(plantData, outcome) {
    this.plantLog.push({
      plant: plantData,
      outcome: outcome,
      timestamp: new Date().toISOString()
    });
    this.confidence = Math.min(1, this.confidence + 0.01);
    this.emit('learn', { plant: plantData, outcome });
  }

  // Ottieni statistiche AI
  getStats() {
    return {
      totalRecommendations: this.recommendations.length,
      confidence: this.confidence,
      plantLog: this.plantLog.length,
      knowledgeBase: {
        plants: Object.keys(this.knowledgeBase.plants).length,
        pests: Object.keys(this.knowledgeBase.pests).length
      }
    };
  }
}

module.exports = new AIRecommendations();

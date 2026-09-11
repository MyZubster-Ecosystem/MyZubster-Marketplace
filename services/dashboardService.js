class DashboardService {
  constructor() {
    this.metrics = {
      totalGardens: 13,
      totalSensors: 24,
      totalReadings: 145,
      totalExchanges: 4,
      activeRobots: 2,
      totalRobots: 9
    };
    this.history = [];
  }

  // Aggiungi metrica
  addMetric(metric) {
    this.history.push({
      ...metric,
      timestamp: new Date()
    });
  }

  // Ottieni dashboard
  getDashboard() {
    return {
      ...this.metrics,
      lastUpdated: new Date(),
      history: this.history.slice(-10)
    };
  }

  // Aggiorna metrica
  updateMetric(key, value) {
    if (key in this.metrics) {
      this.metrics[key] = value;
      this.addMetric({ key, value });
    }
    return this.metrics;
  }
}

module.exports = new DashboardService();

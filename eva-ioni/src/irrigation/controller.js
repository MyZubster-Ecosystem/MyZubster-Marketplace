/**
 * EVA IONI 2.0 - Autonomous Irrigation Controller
 * Supporto all'irrigazione autonomo con AI e sensori
 */

const EventEmitter = require('events');

class IrrigationController extends EventEmitter {
  constructor() {
    super();
    this.zones = {
      vegetable: {
        name: 'Verdure',
        moisture: 0,
        target: 60,
        duration: 10,
        status: 'off'
      },
      flowers: {
        name: 'Fiori',
        moisture: 0,
        target: 50,
        duration: 8,
        status: 'off'
      },
      lawn: {
        name: 'Prato',
        moisture: 0,
        target: 40,
        duration: 15,
        status: 'off'
      },
      trees: {
        name: 'Alberi',
        moisture: 0,
        target: 30,
        duration: 20,
        status: 'off'
      }
    };
    this.schedules = [];
    this.waterUsage = 0;
    this.isActive = false;
    this.autoMode = true;
    this.weatherAware = true;
  }

  // Avvia il sistema
  start() {
    this.isActive = true;
    console.log('💧 Irrigation system started');
    this.emit('status', { status: 'running', autoMode: this.autoMode });
  }

  // Ferma il sistema
  stop() {
    this.isActive = false;
    Object.keys(this.zones).forEach(key => {
      this.zones[key].status = 'off';
    });
    console.log('💧 Irrigation system stopped');
    this.emit('status', { status: 'stopped' });
  }

  // Leggi umidità da sensori
  updateMoisture(zone, moisture) {
    if (this.zones[zone]) {
      this.zones[zone].moisture = moisture;
      this.emit('moisture-update', { zone, moisture });
    }
  }

  // Avvia irrigazione per una zona
  startZone(zone, duration) {
    if (!this.zones[zone]) return { error: 'Zona non trovata' };
    if (!this.isActive) return { error: 'Sistema non attivo' };
    
    const zoneData = this.zones[zone];
    const time = duration || zoneData.duration;
    
    zoneData.status = 'running';
    this.waterUsage += time * 5; // litri
    
    this.emit('irrigation-start', { zone, duration: time });
    
    // Simula irrigazione
    setTimeout(() => {
      zoneData.status = 'off';
      zoneData.moisture = Math.min(100, zoneData.moisture + 20);
      this.emit('irrigation-stop', { zone });
    }, time * 1000);
    
    return { 
      success: true, 
      message: `Irrigazione avviata per ${zoneData.name}`,
      duration: time,
      estimatedWater: time * 5
    };
  }

  // Ferma irrigazione di una zona
  stopZone(zone) {
    if (!this.zones[zone]) return { error: 'Zona non trovata' };
    this.zones[zone].status = 'off';
    this.emit('irrigation-stop', { zone });
    return { success: true, message: `Irrigazione fermata per ${this.zones[zone].name}` };
  }

  // Esecuzione ciclo automatico
  autoCycle() {
    if (!this.autoMode || !this.isActive) return;
    
    Object.keys(this.zones).forEach(zone => {
      const data = this.zones[zone];
      if (data.moisture < data.target) {
        this.startZone(zone);
      }
    });
  }

  // Programma irrigazione
  scheduleIrrigation(schedules) {
    this.schedules = schedules;
    this.emit('schedule-update', { schedules });
    return { success: true, schedules: this.schedules };
  }

  // Ottieni report
  getReport() {
    return {
      active: this.isActive,
      autoMode: this.autoMode,
      weatherAware: this.weatherAware,
      waterUsage: this.waterUsage,
      zones: this.zones,
      schedules: this.schedules
    };
  }

  // Integrazione con previsioni meteo
  updateWeather(forecast) {
    if (this.weatherAware && forecast.includes('rain')) {
      this.stop();
      this.emit('weather-alert', { message: 'Pioggia prevista, irrigazione sospesa' });
      return { status: 'suspended', reason: 'rain_forecast' };
    }
    return { status: 'active' };
  }

  // Riavvia dopo sospensione
  resume() {
    if (!this.isActive) {
      this.start();
      this.emit('resumed', { message: 'Sistema ripreso' });
    }
  }
}

module.exports = new IrrigationController();

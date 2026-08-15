/**
 * EVA IONI 2.0 - Biodiversity Mapping Module
 * Mappatura della biodiversità con AI e citizen science
 */

const EventEmitter = require('events');

class BiodiversityMapper extends EventEmitter {
  constructor() {
    super();
    this.species = {
      plants: [],
      birds: [],
      insects: [],
      mammals: []
    };
    this.invasiveSpecies = [];
    this.pollinators = [];
    this.biodiversityScore = 0;
    this.history = [];
    this.citizenReports = [];
  }

  // Rilevamento specie via AI
  async detectSpecies(image) {
    // Simula riconoscimento AI
    const plants = ['Pomodoro', 'Basilico', 'Lavanda', 'Rosmarino', 'Girasole'];
    const birds = ['Passero', 'Merlo', 'Cinciallegra', 'Pettirosso'];
    const insects = ['Ape', 'Farfalla', 'Coccinella', 'Formica'];
    const mammals = ['Riccio', 'Scoiattolo', 'Talpa'];
    
    const detected = {
      plants: [plants[Math.floor(Math.random() * plants.length)]],
      birds: [birds[Math.floor(Math.random() * birds.length)]],
      insects: [insects[Math.floor(Math.random() * insects.length)]]
    };
    
    this.addSpecies(detected);
    this.emit('species-detected', detected);
    
    return detected;
  }

  // Aggiungi specie al database
  addSpecies(species) {
    if (species.plants) this.species.plants.push(...species.plants);
    if (species.birds) this.species.birds.push(...species.birds);
    if (species.insects) this.species.insects.push(...species.insects);
    if (species.mammals) this.species.mammals.push(...species.mammals);
    
    this.updateScore();
    this.history.push({
      timestamp: new Date().toISOString(),
      species: species,
      score: this.biodiversityScore
    });
  }

  // Tracciamento impollinatori
  trackPollinators(type, count) {
    this.pollinators.push({
      type: type || 'bee',
      count: count || Math.floor(Math.random() * 20) + 1,
      timestamp: new Date().toISOString()
    });
    this.emit('pollinator-track', { type, count });
  }

  // Segnalazione specie invasiva
  reportInvasive(name, description, location) {
    const report = {
      name,
      description,
      location: location || 'Coordinate non disponibili',
      reportedAt: new Date().toISOString()
    };
    this.invasiveSpecies.push(report);
    this.emit('invasive-report', report);
    return report;
  }

  // Citizen science report
  citizenReport(data) {
    const report = {
      id: `citizen-${Date.now()}`,
      ...data,
      reportedAt: new Date().toISOString(),
      verified: false
    };
    this.citizenReports.push(report);
    this.emit('citizen-report', report);
    return report;
  }

  // Calcola punteggio biodiversità
  updateScore() {
    let score = 0;
    score += this.species.plants.length * 2;
    score += this.species.birds.length * 3;
    score += this.species.insects.length * 2;
    score += this.species.mammals.length * 4;
    score -= this.invasiveSpecies.length * 5;
    
    this.biodiversityScore = Math.max(0, Math.min(100, score));
    this.emit('score-update', this.biodiversityScore);
  }

  // Ottieni report completo
  getReport() {
    return {
      species: this.species,
      invasiveSpecies: this.invasiveSpecies,
      pollinators: this.pollinators,
      biodiversityScore: this.biodiversityScore,
      totalSpecies: Object.values(this.species).reduce((a, b) => a + b.length, 0),
      citizenReports: this.citizenReports.length,
      lastUpdated: new Date().toISOString()
    };
  }

  // Genera mappa interattiva (dati per Leaflet)
  generateMapData() {
    return {
      species: this.species,
      invasive: this.invasiveSpecies,
      score: this.biodiversityScore,
      timestamp: new Date().toISOString()
    };
  }

  // Integrazione con API esterne
  async syncWithGlobalDatabase() {
    // Simula sync con database globale
    console.log('🔄 Syncing biodiversity data...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, message: 'Sync completed' };
  }
}

module.exports = new BiodiversityMapper();

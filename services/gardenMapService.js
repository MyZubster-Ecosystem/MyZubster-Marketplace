class GardenMapService {
  constructor() {
    this.gardens = [];
  }

  // Aggiungi orto
  addGarden(data) {
    const garden = {
      id: `GARDEN-${Date.now()}`,
      name: data.name,
      location: {
        lat: data.lat || 44.0678,
        lng: data.lng || 12.5695
      },
      address: data.address || 'Rimini, Italy',
      size: data.size || 50,
      crops: data.crops || ['pomodori', 'basilico'],
      status: 'active',
      createdAt: new Date()
    };
    this.gardens.push(garden);
    return garden;
  }

  // Ottieni orti vicini
  getNearbyGardens(lat, lng, radius = 10) {
    return this.gardens.filter(g => {
      const distance = this.calculateDistance(lat, lng, g.location.lat, g.location.lng);
      return distance <= radius;
    });
  }

  // Calcola distanza (km)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  getStats() {
    return {
      total: this.gardens.length,
      active: this.gardens.filter(g => g.status === 'active').length
    };
  }
}

module.exports = new GardenMapService();

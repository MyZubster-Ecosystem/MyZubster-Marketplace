const {
  protectGardenLocation,
  publicGarden
} = require('./locationPrivacyService');

class GardenMapService {
  constructor() {
    this.gardens = [];
  }

  // Aggiungi orto
  addGarden(data, userId) {
    const protectedLocation = protectGardenLocation(data);
    const garden = {
      id: `GARDEN-${Date.now()}`,
      name: data.name,
      location: protectedLocation.publicLocation,
      address: protectedLocation.publicAddress,
      comune: protectedLocation.publicCity,
      country: protectedLocation.publicCountry,
      locationVisibility: protectedLocation.locationVisibility,
      locationPrecision: protectedLocation.locationPrecision,
      locationConsentVersion: protectedLocation.locationConsentVersion,
      locationConsentedAt: protectedLocation.locationConsentedAt,
      privateLocation: protectedLocation.privateLocation,
      isPublic: data.isPublic === true,
      userId: String(userId),
      size: data.size || 0,
      crops: Array.isArray(data.crops) ? data.crops : [],
      status: 'active',
      createdAt: new Date()
    };
    this.gardens.push(garden);
    return publicGarden(garden);
  }

  // Ottieni orti vicini
  getNearbyGardens(lat, lng, radius = 10) {
    return this.gardens.filter(g => {
      if (g.isPublic !== true || !g.location || !Array.isArray(g.location.coordinates)) return false;
      const [gardenLng, gardenLat] = g.location.coordinates;
      const distance = this.calculateDistance(lat, lng, gardenLat, gardenLng);
      return distance <= radius;
    }).map(publicGarden);
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

const Garden = require('../models/Garden');

class GardenService {
  // Converte il formato coordinate se necessario
  normalizeCoordinates(gardenData) {
    if (gardenData.coordinates) {
      // Se ha lat e lng separati, converti in formato GeoJSON
      if (gardenData.coordinates.lat !== undefined && gardenData.coordinates.lng !== undefined) {
        gardenData.location = {
          type: 'Point',
          coordinates: [parseFloat(gardenData.coordinates.lng), parseFloat(gardenData.coordinates.lat)]
        };
        delete gardenData.coordinates;
      }
      // Se è già un array [lng, lat], usalo direttamente
      else if (Array.isArray(gardenData.coordinates) && gardenData.coordinates.length === 2) {
        gardenData.location = {
          type: 'Point',
          coordinates: gardenData.coordinates
        };
        delete gardenData.coordinates;
      }
      // Se è già un oggetto location, lascialo
      else if (gardenData.coordinates.type === 'Point') {
        // già nel formato corretto
      }
    }
    return gardenData;
  }

  async createGarden(gardenData) {
    try {
      // Normalizza le coordinate
      gardenData = this.normalizeCoordinates(gardenData);
      
      const garden = new Garden(gardenData);
      return await garden.save();
    } catch (error) {
      console.error('Error creating garden:', error);
      throw error;
    }
  }

  async getAllGardens() {
    try {
      const gardens = await Garden.find().sort({ createdAt: -1 });
      // Converti in formato compatibile con il frontend
      return gardens.map(g => this.toFrontendFormat(g));
    } catch (error) {
      console.error('Error fetching gardens:', error);
      throw error;
    }
  }

  async getGardenById(id) {
    try {
      const garden = await Garden.findById(id);
      if (!garden) return null;
      return this.toFrontendFormat(garden);
    } catch (error) {
      console.error('Error fetching garden:', error);
      throw error;
    }
  }

  async findNearbyGardens(lat, lng, radius = 5000) {
    try {
      // Usa la geolocalizzazione di MongoDB
      const gardens = await Garden.find({
        'location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            $maxDistance: radius
          }
        }
      });
      return gardens.map(g => this.toFrontendFormat(g));
    } catch (error) {
      // Se fallisce, prova con la ricerca senza geolocalizzazione
      console.error('Error finding nearby gardens:', error);
      const allGardens = await Garden.find();
      // Filtra manualmente per prossimità
      const filtered = allGardens.filter(g => {
        if (!g.location || !g.location.coordinates) return false;
        const [gLng, gLat] = g.location.coordinates;
        const distance = this.calculateDistance(lat, lng, gLat, gLng);
        return distance <= radius / 1000; // converti in km
      });
      return filtered.map(g => this.toFrontendFormat(g));
    }
  }

  // Calcola distanza in km tra due coordinate
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raggio della Terra in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distanza in km
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Converte il formato del database in formato frontend
  toFrontendFormat(garden) {
    const gardenObj = garden.toObject ? garden.toObject() : garden;
    
    // Estrai lat/lng dalla location
    let lat = null, lng = null;
    if (gardenObj.location && gardenObj.location.coordinates) {
      [lng, lat] = gardenObj.location.coordinates;
    }
    
    // Crea l'oggetto nel formato atteso dal frontend
    return {
      _id: gardenObj._id,
      name: gardenObj.name,
      description: gardenObj.description || '',
      address: gardenObj.address || '',
      neighborhood: gardenObj.neighborhood || '',
      city: gardenObj.city || '',
      coordinates: {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      },
      ownerId: gardenObj.ownerId || '',
      isActive: gardenObj.isActive !== undefined ? gardenObj.isActive : true,
      crops: gardenObj.crops || [],
      sensors: gardenObj.sensors || [],
      size: gardenObj.size || 0,
      createdAt: gardenObj.createdAt,
      updatedAt: gardenObj.updatedAt
    };
  }

  async updateGarden(id, updateData) {
    try {
      // Normalizza le coordinate se presenti
      if (updateData.coordinates) {
        updateData = this.normalizeCoordinates(updateData);
      }
      updateData.updatedAt = new Date();
      const garden = await Garden.findByIdAndUpdate(id, updateData, { new: true });
      if (!garden) return null;
      return this.toFrontendFormat(garden);
    } catch (error) {
      console.error('Error updating garden:', error);
      throw error;
    }
  }

  async deleteGarden(id) {
    try {
      return await Garden.findByIdAndDelete(id);
    } catch (error) {
      console.error('Error deleting garden:', error);
      throw error;
    }
  }
}

module.exports = new GardenService();

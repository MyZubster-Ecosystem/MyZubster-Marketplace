const UrbanCleaningRobot = require('../models/UrbanCleaningRobot');

class UrbanCleaningService {
  constructor() {
    this.robots = new Map();
    this.cleaningLogs = [];
    this.bulkyRequests = [];
  }

  // Registra robot
  async registerRobot(data) {
    try {
      const robot = new UrbanCleaningRobot(data);
      await robot.save();
      this.robots.set(robot.robotId, robot);
      return robot;
    } catch (error) {
      throw new Error(`Failed to register urban cleaning robot: ${error.message}`);
    }
  }

  // Avvia spazzamento
  async startSweeping(robotId, route) {
    const robot = await UrbanCleaningRobot.findOne({ robotId });
    if (!robot) throw new Error('Robot not found');
    
    robot.status = 'cleaning';
    robot.stats.kmCleaned += 1;
    await robot.save();
    
    return {
      success: true,
      robotId,
      action: 'sweeping',
      route,
      status: 'started',
      timestamp: new Date().toISOString()
    };
  }

  // Ritiro rifiuti
  async collectWaste(robotId, wasteType, amount) {
    const robot = await UrbanCleaningRobot.findOne({ robotId });
    if (!robot) throw new Error('Robot not found');
    
    robot.stats.wasteCollected += amount;
    await robot.save();
    
    return {
      success: true,
      robotId,
      action: 'waste_collection',
      wasteType,
      amount,
      timestamp: new Date().toISOString()
    };
  }

  // Ritiro ingombranti
  async bulkyWastePickup(robotId, address, items) {
    const robot = await UrbanCleaningRobot.findOne({ robotId });
    if (!robot) throw new Error('Robot not found');
    
    robot.stats.bulkyItemsRemoved += items.length;
    await robot.save();
    
    const request = {
      id: `BULKY-${Date.now()}`,
      robotId,
      address,
      items,
      status: 'scheduled',
      createdAt: new Date()
    };
    this.bulkyRequests.push(request);
    
    return {
      success: true,
      robotId,
      action: 'bulky_waste_pickup',
      address,
      items,
      status: 'scheduled',
      requestId: request.id,
      timestamp: new Date().toISOString()
    };
  }

  // Lavaggio strade
  async streetWashing(robotId, street, duration) {
    const robot = await UrbanCleaningRobot.findOne({ robotId });
    if (!robot) throw new Error('Robot not found');
    
    return {
      success: true,
      robotId,
      action: 'street_washing',
      street,
      duration,
      status: 'started',
      timestamp: new Date().toISOString()
    };
  }

  // Monitoraggio (drone)
  async monitorStreet(robotId, zone) {
    return {
      success: true,
      robotId,
      action: 'monitoring',
      zone,
      status: 'completed',
      findings: {
        cleanliness: Math.floor(Math.random() * 40) + 60,
        wasteSpots: Math.floor(Math.random() * 10),
        bulkyWaste: Math.floor(Math.random() * 5)
      },
      timestamp: new Date().toISOString()
    };
  }

  // Statistiche Hera
  async getHeraStats() {
    try {
      const total = await UrbanCleaningRobot.countDocuments();
      const active = await UrbanCleaningRobot.countDocuments({ status: 'active' });
      const stats = await UrbanCleaningRobot.aggregate([
        {
          $group: {
            _id: null,
            totalKm: { $sum: '$stats.kmCleaned' },
            totalWaste: { $sum: '$stats.wasteCollected' },
            totalBulky: { $sum: '$stats.bulkyItemsRemoved' }
          }
        }
      ]);
      
      return {
        totalRobots: total,
        activeRobots: active,
        totalKmCleaned: stats[0]?.totalKm || 0,
        totalWasteCollected: stats[0]?.totalWaste || 0,
        totalBulkyItemsRemoved: stats[0]?.totalBulky || 0,
        pendingBulkyRequests: this.bulkyRequests.filter(r => r.status === 'scheduled').length
      };
    } catch (error) {
      throw new Error(`Failed to get Hera stats: ${error.message}`);
    }
  }
}

module.exports = new UrbanCleaningService();

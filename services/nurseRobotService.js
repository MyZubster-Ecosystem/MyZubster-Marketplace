const NurseRobot = require('../models/NurseRobot');

class NurseRobotService {
  constructor() {
    this.robots = new Map();
    this.taskQueue = [];
  }

  // Registra un robot infermiere
  async registerRobot(data) {
    try {
      const robot = new NurseRobot(data);
      await robot.save();
      this.robots.set(robot.robotId, robot);
      return robot;
    } catch (error) {
      throw new Error(`Failed to register nurse robot: ${error.message}`);
    }
  }

  // Assegna un task
  async assignTask(robotId, task) {
    try {
      const robot = await NurseRobot.findOne({ robotId });
      if (!robot) {
        throw new Error('Robot not found');
      }
      if (robot.status !== 'active') {
        throw new Error('Robot is not active');
      }
      
      const job = {
        robotId,
        task,
        assignedAt: new Date(),
        status: 'assigned'
      };
      
      this.taskQueue.push(job);
      robot.tasksCompleted += 1;
      await robot.save();
      
      return job;
    } catch (error) {
      throw new Error(`Failed to assign task: ${error.message}`);
    }
  }

  // Simula Moxi - trasporto farmaci
  async transportMedication(robotId, from, to, medication) {
    console.log(`💊 ${robotId} trasporta ${medication} da ${from} a ${to}`);
    return {
      success: true,
      robotId,
      action: 'transport_medication',
      from,
      to,
      medication,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
  }

  // Simula Teo - monitoraggio cognitivo
  async cognitiveMonitoring(robotId, patientId) {
    console.log(`🧠 ${robotId} esegue test cognitivo su paziente ${patientId}`);
    return {
      success: true,
      robotId,
      action: 'cognitive_monitoring',
      patientId,
      status: 'completed',
      results: {
        memoryScore: Math.floor(Math.random() * 30) + 70,
        attentionScore: Math.floor(Math.random() * 30) + 65
      }
    };
  }

  // Simula Alter-Ego - assistenza SLA
  async slaAssistance(robotId, patientId, task) {
    console.log(`🤖 ${robotId} assiste paziente SLA ${patientId} con ${task}`);
    return {
      success: true,
      robotId,
      action: 'sla_assistance',
      patientId,
      task,
      status: 'completed'
    };
  }

  // Simula Robot OSS - igiene
  async hygieneAssistance(robotId, patientId) {
    console.log(`🧼 ${robotId} esegue igiene su paziente ${patientId}`);
    return {
      success: true,
      robotId,
      action: 'hygiene_assistance',
      patientId,
      status: 'completed'
    };
  }

  // Statistiche robot
  async getStats() {
    try {
      const total = await NurseRobot.countDocuments();
      const active = await NurseRobot.countDocuments({ status: 'active' });
      const tasks = await NurseRobot.aggregate([
        { $group: { _id: null, total: { $sum: '$tasksCompleted' } } }
      ]);
      
      return {
        total,
        active,
        tasksCompleted: tasks[0]?.total || 0
      };
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }
}

module.exports = new NurseRobotService();

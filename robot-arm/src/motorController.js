/**
 * Motor Controller per il Braccio Robotico
 * Gestisce i movimenti dei servomotori
 */

class MotorController {
  constructor() {
    // Simula 4 motori per 4 gradi di libertà
    this.motors = {
      base: { angle: 0, min: -90, max: 90 },
      shoulder: { angle: 0, min: -45, max: 45 },
      elbow: { angle: 0, min: -60, max: 60 },
      wrist: { angle: 0, min: -30, max: 30 }
    };
  }

  // Muovi un motore a un angolo specifico
  moveMotor(motor, angle) {
    if (!this.motors[motor]) {
      throw new Error(`Motor ${motor} not found`);
    }

    const motorData = this.motors[motor];
    if (angle < motorData.min || angle > motorData.max) {
      throw new Error(`Angle ${angle} out of range for ${motor}`);
    }

    motorData.angle = angle;
    return { motor, angle, success: true };
  }

  // Muovi il braccio a una posizione XYZ (cinematica inversa semplificata)
  moveTo(x, y, z) {
    // Calcolo semplificato degli angoli
    const baseAngle = Math.atan2(y, x) * (180 / Math.PI);
    const distance = Math.sqrt(x*x + y*y);
    const shoulderAngle = Math.atan2(z, distance) * (180 / Math.PI);
    const elbowAngle = 90 - shoulderAngle;
    const wristAngle = 0; // Mantiene l'end effector orizzontale

    // Applica i movimenti
    this.moveMotor('base', Math.max(-90, Math.min(90, baseAngle)));
    this.moveMotor('shoulder', Math.max(-45, Math.min(45, shoulderAngle)));
    this.moveMotor('elbow', Math.max(-60, Math.min(60, elbowAngle)));
    this.moveMotor('wrist', Math.max(-30, Math.min(30, wristAngle)));

    return this.getPosition();
  }

  // Ottieni la posizione corrente
  getPosition() {
    return {
      motors: { ...this.motors },
      // Posizione approssimativa basata sugli angoli
      x: Math.cos(this.motors.base.angle * Math.PI / 180) * 30,
      y: Math.sin(this.motors.base.angle * Math.PI / 180) * 30,
      z: Math.sin(this.motors.shoulder.angle * Math.PI / 180) * 20
    };
  }

  // Esegui un task specifico
  executeTask(task, params) {
    const tasks = {
      water: () => {
        this.moveTo(10, 0, -5);
        return { task: 'water', status: 'completed' };
      },
      plant: () => {
        this.moveTo(0, 5, -10);
        return { task: 'plant', status: 'completed' };
      },
      analyze: () => {
        this.moveTo(0, 0, -15);
        return { task: 'analyze', status: 'completed' };
      },
      harvest: () => {
        this.moveTo(5, -5, -8);
        return { task: 'harvest', status: 'completed' };
      }
    };

    if (!tasks[task]) {
      throw new Error(`Task ${task} not supported`);
    }

    return tasks[task]();
  }
}

module.exports = new MotorController();

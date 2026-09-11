class RobotArmService {
  constructor() {
    this.position = { x: 0, y: 0, z: 0 };
    this.gripper = 'open';
    this.status = 'idle';
  }

  // Movimento
  moveTo(x, y, z) {
    this.position = { x, y, z };
    return { success: true, position: this.position };
  }

  // Gripper
  grip() {
    this.gripper = 'closed';
    return { success: true, gripper: this.gripper };
  }

  release() {
    this.gripper = 'open';
    return { success: true, gripper: this.gripper };
  }

  // Pianta un seme
  plantSeed(x, y, z, seedType) {
    this.moveTo(x, y, z);
    this.grip();
    setTimeout(() => this.release(), 500);
    return { success: true, action: 'plant_seed', seedType, position: this.position };
  }

  // Annaffia
  water(x, y, z, amount) {
    this.moveTo(x, y, z);
    return { success: true, action: 'water', amount, position: this.position };
  }

  // Raccolto
  harvest(x, y, z, crop) {
    this.moveTo(x, y, z);
    this.grip();
    setTimeout(() => this.release(), 300);
    return { success: true, action: 'harvest', crop, position: this.position };
  }
}

module.exports = new RobotArmService();

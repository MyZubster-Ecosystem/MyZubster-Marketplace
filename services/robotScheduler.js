class RobotScheduler {
  constructor() {
    this.jobs = [];
    this.running = false;
  }

  // Aggiungi un job
  addJob(robotId, task, priority = 1) {
    const job = {
      id: `job-${Date.now()}`,
      robotId,
      task,
      priority,
      status: 'pending',
      createdAt: new Date()
    };
    this.jobs.push(job);
    this.jobs.sort((a, b) => b.priority - a.priority);
    return job;
  }

  // Esegui il prossimo job
  async executeNext() {
    if (this.running) return;
    if (this.jobs.length === 0) return;

    this.running = true;
    const job = this.jobs.shift();
    job.status = 'running';
    job.startedAt = new Date();

    try {
      // Simula esecuzione
      await new Promise(resolve => setTimeout(resolve, 2000));
      job.status = 'completed';
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
    }

    this.running = false;
    return job;
  }

  // Ottieni statistiche
  getStats() {
    return {
      total: this.jobs.length,
      pending: this.jobs.filter(j => j.status === 'pending').length,
      running: this.jobs.filter(j => j.status === 'running').length,
      completed: this.jobs.filter(j => j.status === 'completed').length,
      failed: this.jobs.filter(j => j.status === 'failed').length
    };
  }
}

module.exports = new RobotScheduler();

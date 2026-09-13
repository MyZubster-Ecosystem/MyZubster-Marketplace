'use strict';

const WorkerRegistry = require('./myzWorkerOperationRegistryService');

class MyzWorkerLeaseRecoverySweeperService {
  constructor(options = {}) {
    this.registry = options.registry || WorkerRegistry;
    this.intervalMs = Math.max(1000, Number(options.intervalMs || process.env.MYZ_WORKER_LEASE_SWEEPER_INTERVAL_MS || 30000));
    this.batchSize = Math.max(1, Math.min(500, Number(options.batchSize || process.env.MYZ_WORKER_LEASE_SWEEPER_BATCH_SIZE || 100)));
    this.timer = null;
    this.running = false;
  }

  async sweepOnce() {
    if (this.running) {
      return { skipped: true, reason: 'sweep_already_running', quarantined: 0, operationIds: [] };
    }
    this.running = true;
    try {
      const operations = await this.registry.quarantineExpiredRunning(this.batchSize);
      return {
        skipped: false,
        quarantined: operations.length,
        operationIds: operations.map(item => item.operationId)
      };
    } finally {
      this.running = false;
    }
  }

  start() {
    if (this.timer) return this.timer;
    if (process.env.MYZ_WORKER_LEASE_SWEEPER_ENABLED !== 'true') return null;

    this.timer = setInterval(() => {
      this.sweepOnce().catch(error => {
        // Recovery is intentionally fail-closed. A sweep failure must not mutate
        // provider settlement, retry work, or release internal credit.
        console.error('[MYZ worker lease sweeper] failed:', error.message);
      });
    }, this.intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
    return this.timer;
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = new MyzWorkerLeaseRecoverySweeperService();
module.exports.MyzWorkerLeaseRecoverySweeperService = MyzWorkerLeaseRecoverySweeperService;

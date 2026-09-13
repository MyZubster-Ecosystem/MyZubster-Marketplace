'use strict';

const axios = require('axios');

const ALLOWED_STATUSES = new Set([
  'not_found',
  'queued',
  'running',
  'retrying',
  'completed',
  'failed',
  'cancelled'
]);

const ACTIVE_STATUSES = new Set(['queued', 'running', 'retrying']);

class MyzInFlightOperationEvidenceAdapter {
  constructor(options = {}) {
    this.baseUrl = String(options.baseUrl || '').replace(/\/$/, '');
    this.apiKey = options.apiKey || null;
    this.reviewed = options.reviewed === true;
    this.timeoutMs = Number(options.timeoutMs || 8000);
    this.http = options.httpClient || axios;
    this.source = 'myz-in-flight-operation-evidence';

    if (!this.baseUrl) throw new TypeError('In-flight operation evidence URL is required');
    if (!this.reviewed) {
      const error = new Error('In-flight operation evidence adapter must be explicitly reviewed before use');
      error.code = 'MYZ_INFLIGHT_EVIDENCE_ADAPTER_NOT_REVIEWED';
      throw error;
    }
  }

  headers() {
    return {
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
    };
  }

  async lookup(report) {
    const redemption = report?.redemption || null;
    const reservation = report?.reservation || null;
    const redemptionId = String(redemption?.redemptionId || reservation?.redemptionId || '').trim();
    const reservationId = String(reservation?.reservationId || redemption?.reservationId || '').trim();
    const quoteId = String(redemption?.quoteId || '').trim();
    const providerTransactionId = String(redemption?.providerTransactionId || '').trim();

    if (!redemptionId && !reservationId && !quoteId && !providerTransactionId) {
      const error = new Error('Insufficient references for in-flight operation evidence lookup');
      error.code = 'MYZ_INFLIGHT_EVIDENCE_REFERENCES_INCOMPLETE';
      throw error;
    }

    const response = await this.http.get(`${this.baseUrl}/operations/lookup`, {
      headers: this.headers(),
      timeout: this.timeoutMs,
      params: {
        ...(redemptionId ? { redemptionId } : {}),
        ...(reservationId ? { reservationId } : {}),
        ...(quoteId ? { quoteId } : {}),
        ...(providerTransactionId ? { providerTransactionId } : {})
      },
      validateStatus: status => status >= 200 && status < 300
    });

    const data = response?.data?.data || response?.data;
    if (!data || data.schema !== 'myzubster-in-flight-operation-evidence/v1') {
      const error = new Error('In-flight operation evidence endpoint returned an invalid schema');
      error.code = 'INVALID_MYZ_INFLIGHT_EVIDENCE_RESPONSE';
      throw error;
    }

    const status = String(data.status || '').trim().toLowerCase();
    if (!ALLOWED_STATUSES.has(status)) {
      const error = new Error('In-flight operation evidence response has an unsupported status');
      error.code = 'INVALID_MYZ_INFLIGHT_EVIDENCE_RESPONSE';
      throw error;
    }

    if (data.redemptionId && redemptionId && String(data.redemptionId) !== redemptionId) {
      const error = new Error('In-flight operation evidence redemption ID does not match Marketplace record');
      error.code = 'MYZ_INFLIGHT_EVIDENCE_REFERENCE_MISMATCH';
      throw error;
    }
    if (data.reservationId && reservationId && String(data.reservationId) !== reservationId) {
      const error = new Error('In-flight operation evidence reservation ID does not match Marketplace record');
      error.code = 'MYZ_INFLIGHT_EVIDENCE_REFERENCE_MISMATCH';
      throw error;
    }

    return { ...data, status };
  }

  async collect(report) {
    const data = await this.lookup(report);
    const active = ACTIVE_STATUSES.has(data.status);
    const normalizedStatus = active ? 'active' : 'none';

    const evidence = {
      verified: true,
      source: this.source,
      checkedAt: new Date().toISOString(),
      status: normalizedStatus,
      workerStatus: data.status,
      operationId: data.operationId || null,
      operationType: data.operationType || null,
      attempt: data.attempt == null ? null : Number(data.attempt),
      maxAttempts: data.maxAttempts == null ? null : Number(data.maxAttempts),
      leaseExpiresAt: data.leaseExpiresAt || null,
      nextRetryAt: data.nextRetryAt || null,
      startedAt: data.startedAt || null,
      completedAt: data.completedAt || null,
      evidenceRevision: data.evidenceRevision || null
    };

    return {
      inFlightOperationStatus: evidence,
      workerOperationStatus: {
        ...evidence,
        status: data.status
      }
    };
  }
}

module.exports = MyzInFlightOperationEvidenceAdapter;
module.exports.ALLOWED_STATUSES = ALLOWED_STATUSES;
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;

const crypto = require('crypto');
const axios = require('axios');
const MyzLedgerReservation = require('../models/MyzLedgerReservation');

const DECIMAL_RE = /^\d+(?:\.\d{1,18})?$/;

function toUnits(value, scale = 18) {
  const text = String(value || '').trim();
  if (!DECIMAL_RE.test(text)) {
    const error = new Error('MYZ amount must be a non-negative decimal string with at most 18 fractional digits');
    error.code = 'INVALID_MYZ_LEDGER_AMOUNT';
    throw error;
  }
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole + fraction.padEnd(scale, '0'));
}

function fromUnits(units, scale = 18) {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const raw = absolute.toString().padStart(scale + 1, '0');
  const whole = raw.slice(0, -scale);
  const fraction = raw.slice(-scale).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

class MyzInternalLedgerAdapter {
  constructor(options = {}) {
    this.baseUrl = String(options.baseUrl || '').replace(/\/$/, '');
    this.apiKey = options.apiKey || null;
    this.reviewed = options.reviewed === true;
    this.timeoutMs = Number(options.timeoutMs || 8000);
    this.accountPrefix = String(options.accountPrefix || 'marketplace:user:');

    if (!this.baseUrl) throw new TypeError('Canonical MYZ ledger service URL is required');
    if (!this.reviewed) {
      const error = new Error('Canonical MYZ ledger adapter must be explicitly reviewed before use');
      error.code = 'MYZ_LEDGER_ADAPTER_NOT_REVIEWED';
      throw error;
    }
  }

  headers(extra = {}) {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      ...extra
    };
  }

  accountIdForUser(userId) {
    const normalized = String(userId || '').trim();
    if (!normalized) {
      const error = new Error('Authenticated user is required for MYZ ledger operations');
      error.code = 'INVALID_MYZ_LEDGER_ACCOUNT';
      throw error;
    }
    return `${this.accountPrefix}${normalized}`;
  }

  async getCanonicalBalance(accountId) {
    const response = await axios.get(
      `${this.baseUrl}/v1/myz/accounts/${encodeURIComponent(accountId)}/balance`,
      {
        headers: this.headers(),
        timeout: this.timeoutMs,
        validateStatus: status => status >= 200 && status < 300
      }
    );
    const data = response.data && response.data.data ? response.data.data : response.data;
    if (!data || data.schema !== 'myzubster-myz-ledger-balance/v1' || data.asset !== 'MYZ') {
      const error = new Error('Canonical MYZ ledger returned an invalid balance response');
      error.code = 'INVALID_MYZ_LEDGER_BALANCE_RESPONSE';
      throw error;
    }
    const balanceMyz = String(data.balanceMyz ?? '').trim();
    toUnits(balanceMyz);
    return {
      accountId,
      balanceMyz,
      revision: String(data.revision || '').trim() || null
    };
  }

  async activeReservedUnits(accountId, excludeReservationId = null) {
    const query = { accountId, state: 'reserved' };
    if (excludeReservationId) query.reservationId = { $ne: excludeReservationId };
    const reservations = await MyzLedgerReservation.find(query).select('amountMyz').lean();
    return reservations.reduce((sum, reservation) => sum + toUnits(reservation.amountMyz), 0n);
  }

  async reserveInternalCredit({ redemptionId, fromAmount, requestedBy, idempotencyKey }) {
    const amountUnits = toUnits(fromAmount);
    if (amountUnits <= 0n) {
      const error = new Error('MYZ reservation amount must be greater than zero');
      error.code = 'INVALID_MYZ_LEDGER_AMOUNT';
      throw error;
    }

    const existing = await MyzLedgerReservation.findOne({ idempotencyKey }).lean();
    if (existing) {
      return {
        reservationId: existing.reservationId,
        accountId: existing.accountId,
        amountMyz: existing.amountMyz,
        state: existing.state,
        idempotentReplay: true
      };
    }

    const accountId = this.accountIdForUser(requestedBy);
    const balance = await this.getCanonicalBalance(accountId);
    const balanceUnits = toUnits(balance.balanceMyz);
    const alreadyReserved = await this.activeReservedUnits(accountId);
    const availableUnits = balanceUnits - alreadyReserved;

    if (availableUnits < amountUnits) {
      const error = new Error('Insufficient available MYZ internal credit');
      error.code = 'INSUFFICIENT_MYZ_INTERNAL_CREDIT';
      error.availableMyz = fromUnits(availableUnits < 0n ? 0n : availableUnits);
      throw error;
    }

    const reservationId = `MYZR-${crypto.randomUUID()}`;
    let reservation;
    try {
      reservation = await MyzLedgerReservation.create({
        reservationId,
        redemptionId,
        requestedBy,
        accountId,
        amountMyz: fromUnits(amountUnits),
        state: 'reserved',
        canonicalBalanceAtReserve: balance.balanceMyz,
        canonicalLedgerRevision: balance.revision,
        idempotencyKey
      });
    } catch (error) {
      if (error && error.code === 11000) {
        const duplicate = await MyzLedgerReservation.findOne({ idempotencyKey }).lean();
        if (duplicate) return { ...duplicate, idempotentReplay: true };
      }
      throw error;
    }

    // Fail closed under concurrent reservations. This second check can over-reject,
    // but it prevents two simultaneous reservations from both assuming the same credit.
    const reservedAfterInsert = await this.activeReservedUnits(accountId);
    if (reservedAfterInsert > balanceUnits) {
      reservation.state = 'released';
      reservation.releaseReason = 'concurrent_reservation_overcommit';
      await reservation.save();
      const error = new Error('MYZ credit became unavailable during reservation');
      error.code = 'MYZ_LEDGER_RESERVATION_CONFLICT';
      throw error;
    }

    return {
      reservationId,
      accountId,
      amountMyz: reservation.amountMyz,
      canonicalBalanceAtReserve: reservation.canonicalBalanceAtReserve,
      canonicalLedgerRevision: reservation.canonicalLedgerRevision,
      state: reservation.state
    };
  }

  async commitInternalDebit({ reservationId, redemptionId, requestedBy, providerTransactionId, evidenceHash, idempotencyKey }) {
    const reservation = await MyzLedgerReservation.findOne({ reservationId, redemptionId, requestedBy });
    if (!reservation) {
      const error = new Error('MYZ ledger reservation not found');
      error.code = 'MYZ_LEDGER_RESERVATION_NOT_FOUND';
      throw error;
    }
    if (reservation.state === 'committed') {
      return {
        reservationId,
        state: 'committed',
        canonicalDebitEntryId: reservation.canonicalDebitEntryId,
        idempotentReplay: true
      };
    }
    if (reservation.state !== 'reserved') {
      const error = new Error(`Cannot commit MYZ reservation in state ${reservation.state}`);
      error.code = 'INVALID_MYZ_LEDGER_RESERVATION_STATE';
      throw error;
    }

    const debitAmount = `-${reservation.amountMyz}`;
    const response = await axios.post(`${this.baseUrl}/v1/myz/entries`, {
      schema: 'myzubster-myz-ledger-entry-request/v1',
      asset: 'MYZ',
      account_id: reservation.accountId,
      amount_myz: debitAmount,
      entry_type: 'ADJUSTMENT_DEBIT',
      status: 'RECORDED',
      reference: {
        program: 'marketplace-redemption',
        redemption_id: redemptionId,
        provider_transaction_id: providerTransactionId
      },
      evidence: evidenceHash ? [`sha256:${evidenceHash}`] : [],
      note: 'MYZ internal debit committed after independently evidenced external redemption reconciliation.'
    }, {
      headers: this.headers({ 'Idempotency-Key': `myz-ledger-debit-${idempotencyKey}` }),
      timeout: this.timeoutMs,
      validateStatus: status => status >= 200 && status < 300
    });

    const data = response.data && response.data.data ? response.data.data : response.data;
    if (!data || data.schema !== 'myzubster-myz-ledger-entry/v1' || data.asset !== 'MYZ' || data.status !== 'RECORDED') {
      const error = new Error('Canonical MYZ ledger did not confirm a recorded debit entry');
      error.code = 'MYZ_LEDGER_DEBIT_UNVERIFIED';
      throw error;
    }
    if (String(data.account_id) !== reservation.accountId || String(data.amount_myz) !== debitAmount || !data.entry_id) {
      const error = new Error('Canonical MYZ ledger debit does not match the reserved credit');
      error.code = 'MYZ_LEDGER_DEBIT_MISMATCH';
      throw error;
    }

    reservation.state = 'committed';
    reservation.canonicalDebitEntryId = String(data.entry_id);
    await reservation.save();

    return {
      reservationId,
      state: 'committed',
      canonicalDebitEntryId: reservation.canonicalDebitEntryId
    };
  }

  async releaseReservation({ reservationId, redemptionId, requestedBy, reason }) {
    const reservation = await MyzLedgerReservation.findOne({ reservationId, redemptionId, requestedBy });
    if (!reservation) {
      const error = new Error('MYZ ledger reservation not found');
      error.code = 'MYZ_LEDGER_RESERVATION_NOT_FOUND';
      throw error;
    }
    if (reservation.state === 'released') {
      return { reservationId, state: 'released', idempotentReplay: true };
    }
    if (reservation.state === 'committed') {
      const error = new Error('Committed MYZ debit cannot be released; a canonical reversal is required');
      error.code = 'MYZ_LEDGER_REVERSAL_REQUIRED';
      throw error;
    }
    if (reservation.state !== 'reserved') {
      const error = new Error(`Cannot release MYZ reservation in state ${reservation.state}`);
      error.code = 'INVALID_MYZ_LEDGER_RESERVATION_STATE';
      throw error;
    }

    reservation.state = 'released';
    reservation.releaseReason = String(reason || 'redemption_cancelled');
    await reservation.save();
    return { reservationId, state: 'released' };
  }

  async getReservation(reservationId, requestedBy) {
    return MyzLedgerReservation.findOne({ reservationId, requestedBy })
      .select('-_id reservationId redemptionId accountId amountMyz state canonicalBalanceAtReserve canonicalLedgerRevision canonicalDebitEntryId releaseReason failureCode createdAt updatedAt')
      .lean();
  }
}

module.exports = MyzInternalLedgerAdapter;
module.exports.toUnits = toUnits;
module.exports.fromUnits = fromUnits;

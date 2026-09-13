const DEFAULT_FEE_BPS = Number(process.env.MYZ_CONVERSION_FEE_BPS || 100);

function normalizeDecimal(value) {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,18})?$/.test(text)) {
    throw new TypeError('Expected a non-negative decimal string with at most 18 fractional digits');
  }
  return text;
}

function toUnits(value, scale = 18) {
  const normalized = normalizeDecimal(value);
  const [whole, fractional = ''] = normalized.split('.');
  return BigInt(whole + fractional.padEnd(scale, '0'));
}

function fromUnits(units, scale = 18) {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const raw = absolute.toString().padStart(scale + 1, '0');
  const whole = raw.slice(0, -scale);
  const fraction = raw.slice(-scale).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

function calculateFee(amount, basisPoints = DEFAULT_FEE_BPS) {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) {
    throw new RangeError('Fee basis points must be an integer between 0 and 10000');
  }
  const units = toUnits(amount);
  return fromUnits((units * BigInt(basisPoints)) / 10000n);
}

function applyMyZubsterFee(grossRecipientAmount, basisPoints = DEFAULT_FEE_BPS) {
  const gross = toUnits(grossRecipientAmount);
  const fee = toUnits(calculateFee(grossRecipientAmount, basisPoints));
  if (fee > gross) throw new RangeError('Fee cannot exceed recipient amount');
  return {
    grossRecipientAmount: fromUnits(gross),
    myzubsterFee: fromUnits(fee),
    recipientAmount: fromUnits(gross - fee),
    feeBasisPoints: basisPoints
  };
}

module.exports = {
  DEFAULT_FEE_BPS,
  calculateFee,
  applyMyZubsterFee,
  normalizeDecimal
};

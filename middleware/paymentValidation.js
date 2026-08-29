const CRYPTO_CURRENCIES = new Set(['BTC', 'ETH', 'XMR', 'MYZ', 'TARI']);
const FIAT_CURRENCIES = new Set(['EUR', 'USD', 'GBP']);
const ALL_CURRENCIES = new Set([...CRYPTO_CURRENCIES, ...FIAT_CURRENCIES]);

function parsePositiveAmount(value) {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    return null;
  }
  return amount;
}

function normalizePaymentAmount(value) {
  const amount = typeof value === 'number' ? String(value) : value?.trim?.();
  if (typeof amount !== 'string' || !/^(?:0|[1-9]\d{0,8})(?:\.\d{1,18})?$/.test(amount)) {
    return null;
  }
  if (Number(amount) <= 0) return null;
  return amount;
}

function normalizeCurrency(value, supported = ALL_CURRENCIES) {
  if (typeof value !== 'string') return null;
  const currency = value.trim().toUpperCase();
  return supported.has(currency) ? currency : null;
}

function normalizeRecipient(value) {
  if (typeof value !== 'string') return null;
  const recipient = value.trim();
  if (recipient.length < 3 || recipient.length > 256 || /[\u0000-\u001f\u007f]/.test(recipient)) {
    return null;
  }
  return recipient;
}

function validatePaymentBody(supportedCurrencies) {
  return (req, res, next) => {
    const amount = normalizePaymentAmount(req.body?.amount);
    const currency = normalizeCurrency(req.body?.currency, supportedCurrencies);
    const recipient = normalizeRecipient(req.body?.recipient);

    if (amount === null || currency === null || recipient === null) {
      return res.status(400).json({
        error: 'Invalid payment request',
        code: 'INVALID_PAYMENT_REQUEST',
        required: ['positive numeric amount', 'supported currency', 'recipient between 3 and 256 characters']
      });
    }

    req.validatedPayment = { amount, currency, recipient };
    return next();
  };
}

function validateConversionQuery(supportedCurrencies) {
  return (req, res, next) => {
    const amount = parsePositiveAmount(req.query?.amount);
    const from = normalizeCurrency(req.query?.from, supportedCurrencies);
    const to = normalizeCurrency(req.query?.to, supportedCurrencies);

    if (amount === null || from === null || to === null || from === to) {
      return res.status(400).json({
        error: 'Invalid conversion request',
        code: 'INVALID_CONVERSION_REQUEST'
      });
    }

    req.validatedConversion = { amount, from, to };
    return next();
  };
}

module.exports = {
  ALL_CURRENCIES,
  CRYPTO_CURRENCIES,
  FIAT_CURRENCIES,
  normalizeCurrency,
  normalizePaymentAmount,
  normalizeRecipient,
  parsePositiveAmount,
  validateConversionQuery,
  validatePaymentBody
};

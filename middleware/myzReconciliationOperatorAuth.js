'use strict';

const crypto = require('crypto');

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function requireMyzReconciliationOperator(req, res, next) {
  const expected = process.env.MYZ_RECONCILIATION_OPERATOR_TOKEN;
  if (!expected) {
    return res.status(503).json({
      success: false,
      code: 'MYZ_RECONCILIATION_OPERATOR_AUTH_UNCONFIGURED',
      error: 'MYZ reconciliation operator authentication is not configured'
    });
  }

  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!safeEqual(token, expected)) {
    return res.status(401).json({
      success: false,
      code: 'MYZ_RECONCILIATION_OPERATOR_UNAUTHORIZED',
      error: 'Unauthorized reconciliation operator request'
    });
  }

  return next();
}

module.exports = { requireMyzReconciliationOperator, safeEqual };

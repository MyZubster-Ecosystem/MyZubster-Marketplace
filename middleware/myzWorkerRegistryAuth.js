'use strict';

const crypto = require('crypto');

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function requireMyzWorkerRegistryRead(req, res, next) {
  const expected = process.env.MYZ_WORKER_REGISTRY_READ_TOKEN;
  if (!expected) {
    return res.status(503).json({
      success: false,
      code: 'MYZ_WORKER_REGISTRY_AUTH_UNCONFIGURED',
      error: 'MYZ worker registry read authentication is not configured'
    });
  }
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!safeEqual(token, expected)) {
    return res.status(401).json({
      success: false,
      code: 'MYZ_WORKER_REGISTRY_UNAUTHORIZED',
      error: 'Unauthorized MYZ worker registry request'
    });
  }
  return next();
}

module.exports = { requireMyzWorkerRegistryRead, safeEqual };

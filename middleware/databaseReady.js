const mongoose = require('mongoose');

let testOverride;

function isDatabaseReady() {
  if (process.env.NODE_ENV === 'test' && typeof testOverride === 'boolean') {
    return testOverride;
  }

  return mongoose.connection.readyState === 1;
}

function requireDatabaseReady(req, res, next) {
  if (!isDatabaseReady()) {
    return res.status(503).json({
      error: 'Database temporarily unavailable',
      code: 'DATABASE_UNAVAILABLE'
    });
  }

  return next();
}

function setDatabaseReadyForTests(value) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Database readiness can only be overridden in tests');
  }

  testOverride = typeof value === 'boolean' ? value : undefined;
}

module.exports = {
  isDatabaseReady,
  requireDatabaseReady,
  setDatabaseReadyForTests
};

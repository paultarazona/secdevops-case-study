'use strict';

const path = require('path');
const crypto = require('crypto');

// Sets required environment variables BEFORE any application module is
// required, so src/config/env.js and src/db/connection.js pick up an
// isolated, throwaway SQLite file instead of touching real data. Each caller
// gets its own DB file so `node --test` (which runs test files in separate
// processes) never lets two test files collide on the same database.
function setTestEnv(dbSuffix) {
  const suffix = dbSuffix || crypto.randomUUID();
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  process.env.JWT_SECRET = 'test-jwt-secret-not-for-production';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-not-for-production';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.DB_PATH = path.join(__dirname, '..', 'data', `test-${suffix}.db`);
  process.env.RATE_LIMIT_WINDOW_MS = '900000';
  process.env.RATE_LIMIT_MAX = '1000';
  process.env.UPLOAD_MAX_BYTES = '5242880';
  return process.env.DB_PATH;
}

module.exports = { setTestEnv };

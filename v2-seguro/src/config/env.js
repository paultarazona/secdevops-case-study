// Mitigation #7 (hardcoded secrets): every piece of configuration is read
// from process.env, populated via dotenv from a local .env file that is
// never committed (see .gitignore). .env.example documents every variable
// with placeholder values only.
require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),

  CORS_ORIGIN: required('CORS_ORIGIN', 'http://localhost:5173'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  DB_PATH: process.env.DB_PATH || './data/v2-seguro.db',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),

  UPLOAD_MAX_BYTES: parseInt(process.env.UPLOAD_MAX_BYTES || '5242880', 10),
};

module.exports = env;

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Mitigation #6 (insecure config): throttle brute-force attempts against
// login/register, which v1 leaves completely unlimited.
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

module.exports = { authLimiter };

const env = require('./env');

// Mitigation #6 (insecure config): CORS is restricted to a single explicit
// origin read from the environment, instead of v1's `origin: '*'`.
const corsOptions = {
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = corsOptions;

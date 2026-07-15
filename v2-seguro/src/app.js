const express = require('express');
const cors = require('cors');

const buildHelmetMiddleware = require('./config/helmet');
const corsOptions = require('./config/cors');
const requireAuth = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const resourcesRoutes = require('./routes/resources');

const app = express();

// Mitigation #6 (insecure config): Helmet security headers + CORS locked to
// a single explicit origin (see src/config/helmet.js, src/config/cors.js).
app.use(buildHelmetMiddleware());
app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/resources', requireAuth, resourcesRoutes);

app.use(notFoundHandler);

// Mitigation #6 (insecure config): centralized error handler - logs the
// real error server-side, returns a generic message to the client, never a
// stack trace (see src/middleware/errorHandler.js).
app.use(errorHandler);

module.exports = app;

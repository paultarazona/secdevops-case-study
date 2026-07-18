const express = require('express');
const cors = require('cors');
const path = require('node:path');

const requireAuth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const resourcesRoutes = require('./routes/resources');
const labRoutes = require('./routes/lab');

const app = express();

// VULNERABILITY #6 - Insecure configuration:
// - CORS wide open to any origin.
// - No Helmet (no security response headers at all).
// - No rate limiting on /api/auth/login (brute force is unthrottled).
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/lab', express.static(process.env.LAB_ASSETS_PATH || path.resolve(__dirname, '..', '..', 'lab')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/resources', requireAuth, resourcesRoutes);
app.use('/api/lab', requireAuth, labRoutes);

// VULNERABILITY #6 - "debug mode" error handler: leaks full stack traces
// and internal error details in JSON responses instead of a generic message.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,
  });
});

module.exports = app;

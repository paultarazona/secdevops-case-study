const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

// VULNERABILITY #3 - Insecure JWT handling
// - Secret is a hardcoded string literal (see src/config.js), not loaded
//   from an environment variable or secret manager.
// - Tokens are verified/signed with no algorithm restriction and (on the
//   signing side, in routes/auth.js) no `expiresIn`, so a stolen token is
//   valid forever.
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    // No algorithm allow-list passed to verify(), no expiry check needed
    // because tokens are never issued with an expiry in the first place.
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token', details: err.message });
  }
}

module.exports = requireAuth;

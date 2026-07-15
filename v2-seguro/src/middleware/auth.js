const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Mitigation #3 (insecure JWT): verification pins the algorithm explicitly
// (HS256) instead of trusting whatever `alg` header the token claims, which
// is exactly the class of bug behind CVE-2022-23529 in jsonwebtoken <=8.5.1.
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;

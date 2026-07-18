const express = require('express');
const db = require('../db/connection');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Local educational evidence only: V1 exposes the stored value to demonstrate
// why plaintext password storage is a security failure.
router.get('/password-storage', (req, res) => {
  const user = db.prepare('SELECT username, password_hash FROM users WHERE id = ?').get(req.user.id);
  return res.json({ storage: 'plaintext', username: user.username, storedValue: user.password_hash });
});

router.get('/jwt-lifecycle', (req, res) => {
  return res.json({ algorithmPinned: false, accessTokenExpires: Boolean(req.user.exp), refreshRotation: false, decoded: jwt.decode(req.headers.authorization.slice(7)) });
});

router.get('/security-configuration', (req, res) => res.json({ cors: 'open', securityHeaders: false, authRateLimit: false, errorsExposeDetails: true }));

router.get('/hardcoded-secrets', (req, res) => res.json({ secretSource: 'source-code', secretExposed: true, configurationIsHardcoded: true }));

module.exports = router;

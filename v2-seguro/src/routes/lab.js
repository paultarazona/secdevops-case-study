const express = require('express');
const env = require('../config/env');

const router = express.Router();

// The hardened lab confirms the real storage policy without returning a hash.
router.get('/password-storage', (req, res) => {
  return res.json({ storage: 'bcrypt', rounds: 12, hashExposed: false, username: req.user.username });
});

router.get('/jwt-lifecycle', (req, res) => {
  return res.json({ algorithmPinned: true, accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES_IN, refreshRotation: true, separateRefreshSecret: true });
});

router.get('/security-configuration', (req, res) => res.json({ cors: 'single-origin', securityHeaders: true, authRateLimit: true, errorsExposeDetails: false }));

router.get('/hardcoded-secrets', (req, res) => res.json({ secretSource: 'environment', secretExposed: false, configurationIsHardcoded: false }));

module.exports = router;

const express = require('express');
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Mitigation #6 (insecure config): rate limiting on login/register to slow
// down brute-force / credential-stuffing attempts, which v1 leaves
// completely unthrottled.
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);

module.exports = router;

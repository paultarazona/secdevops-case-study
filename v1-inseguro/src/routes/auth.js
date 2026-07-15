const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');
const { JWT_SECRET } = require('../config');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    // VULNERABILITY #2 - password stored in PLAIN TEXT, no hashing at all.
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const info = stmt.run(username, password);

    return res.status(201).json({ id: info.lastInsertRowid, username });
  } catch (err) {
    // VULNERABILITY #6 - debug mode: full stack trace leaked to the client.
    return res.status(500).json({ error: 'Registration failed', stack: err.stack });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    // VULNERABILITY #1 - SQL Injection.
    // The username (and, effectively, the password check below) are built
    // via raw string concatenation into the SQL text instead of using
    // parameterized placeholders. A username like:
    //   ' OR '1'='1
    // makes the WHERE clause always true and returns the first user row,
    // bypassing authentication entirely.
    const query = `SELECT * FROM users WHERE username = '${username}' AND password_hash = '${password}'`;
    const user = db.prepare(query).get();

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // VULNERABILITY #3 - JWT signed with a hardcoded secret and NO expiresIn,
    // so the token is valid forever.
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);

    return res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    // VULNERABILITY #6 - debug mode: full stack trace + raw error leaked.
    return res.status(500).json({ error: 'Login failed', message: err.message, stack: err.stack });
  }
});

module.exports = router;

const db = require('../db/connection');

// Mitigation #1 (SQL injection): every query here uses better-sqlite3's
// `.prepare()` with `?` placeholders. There is no string concatenation of
// user-controlled input into SQL text anywhere in this file.

function findByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function create(username, passwordHash) {
  const info = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, passwordHash);
  return findById(info.lastInsertRowid);
}

module.exports = {
  findByUsername,
  findById,
  create,
};

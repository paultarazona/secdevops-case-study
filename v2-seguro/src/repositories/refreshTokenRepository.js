const crypto = require('crypto');
const db = require('../db/connection');

// Mitigation #3 (insecure JWT): refresh tokens are tracked server-side by
// hash (never stored raw) so they can be looked up and revoked, giving a
// real (not merely simulated) refresh mechanism.

function hash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function store(userId, token, expiresAtIso) {
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(userId, hash(token), expiresAtIso);
}

function findValid(token) {
  return db
    .prepare(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > datetime('now')`
    )
    .get(hash(token));
}

function revoke(token) {
  db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?`).run(
    hash(token)
  );
}

module.exports = {
  store,
  findValid,
  revoke,
};

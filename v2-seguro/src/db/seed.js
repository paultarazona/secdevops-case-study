const bcrypt = require('bcrypt');
const db = require('./connection');

// Mitigation #2 (plaintext passwords): seed mirrors the register endpoint
// and stores a bcrypt hash, never the raw password.
const BCRYPT_ROUNDS = 12;

function upsertUser(username, plaintextPassword) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    console.log(`User '${username}' already exists (id=${existing.id}), skipping.`);
    return existing.id;
  }
  const passwordHash = bcrypt.hashSync(plaintextPassword, BCRYPT_ROUNDS);
  const info = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, passwordHash);
  console.log(`Created user '${username}' (id=${info.lastInsertRowid}).`);
  return info.lastInsertRowid;
}

function ensureResource(userId, title, content) {
  const existing = db
    .prepare('SELECT id FROM resources WHERE user_id = ? AND title = ?')
    .get(userId, title);
  if (existing) {
    console.log(`Resource '${title}' already exists for user ${userId}, skipping.`);
    return existing.id;
  }
  const info = db
    .prepare('INSERT INTO resources (user_id, title, content) VALUES (?, ?, ?)')
    .run(userId, title, content);
  console.log(`Created resource '${title}' (id=${info.lastInsertRowid}) for user ${userId}.`);
  return info.lastInsertRowid;
}

const aliceId = upsertUser('alice', 'alice123');
ensureResource(aliceId, 'Alice private note', 'This is a secret note that belongs only to alice.');

const bobId = upsertUser('bob', 'bob123');
ensureResource(bobId, 'Bob private note', 'This is a secret note that belongs only to bob.');

console.log('Seed complete.');

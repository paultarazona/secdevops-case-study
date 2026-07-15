'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const bcrypt = require('bcrypt');

const { setTestEnv } = require('../testEnv');

const dbPath = setTestEnv('user-repository');
fs.rmSync(dbPath, { force: true });

// Required after setTestEnv() so src/db/connection.js opens the throwaway
// test database instead of the real one.
const db = require('../../src/db/connection');
const userRepository = require('../../src/repositories/userRepository');

test.after(() => {
  db.close();
  // better-sqlite3 keeps a native file handle open on Windows even after
  // close(); removal can transiently EPERM there. This is cleanup-only, so
  // failures here must not fail the suite.
  try {
    fs.rmSync(dbPath, { force: true });
  } catch {
    // best-effort cleanup
  }
});

test('userRepository.create stores a bcrypt hash, never the raw password', async () => {
  const rawPassword = 'correct-horse-battery-staple';
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  const created = userRepository.create('repo-test-user', passwordHash);

  assert.equal(created.username, 'repo-test-user');
  assert.notEqual(created.password_hash, rawPassword);
  assert.equal(created.password_hash, passwordHash);
});

test('userRepository.findByUsername returns the stored user', async () => {
  const passwordHash = await bcrypt.hash('another-password', 12);
  userRepository.create('lookup-user', passwordHash);

  const found = userRepository.findByUsername('lookup-user');

  assert.ok(found);
  assert.equal(found.username, 'lookup-user');
});

test('userRepository.findByUsername returns undefined for unknown users', () => {
  const found = userRepository.findByUsername('does-not-exist');
  assert.equal(found, undefined);
});

test('bcrypt hash/compare round trip succeeds for the correct password and fails otherwise', async () => {
  const hash = await bcrypt.hash('s3cr3t-pw', 12);

  assert.equal(await bcrypt.compare('s3cr3t-pw', hash), true);
  assert.equal(await bcrypt.compare('wrong-pw', hash), false);
});

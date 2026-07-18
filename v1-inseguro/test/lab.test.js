'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dbPath = path.join(os.tmpdir(), `v1-lab-${process.pid}.db`);
process.env.V1_TEST_DB_PATH = dbPath;
fs.rmSync(dbPath, { force: true });

const app = require('../src/app');
const db = require('../src/db/connection');

let server;

test.before(() => {
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('alice', 'alice123');
  server = app.listen(0);
});

test.after(() => {
  server.close();
  db.close();
  fs.rmSync(dbPath, { force: true });
});

test('uses an isolated database for lab integration tests', () => {
  assert.equal(db.name, dbPath);
});

test('serves the shared challenge catalog', async () => {
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/lab/catalog.js`);

  assert.equal(res.status, 200);
  const catalog = await res.text();
  assert.match(catalog, /SQL Injection/);
  assert.match(catalog, /id: 'idor'.*available: true/);
  assert.match(catalog, /id: 'upload-traversal'.*available: true/);
});

test('returns V1 lab evidence after authentication', async () => {
  const { port } = server.address();
  const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'alice', password: 'alice123' }),
  });
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };
  const [passwords, jwt, configuration, secrets] = await Promise.all([
    fetch(`http://127.0.0.1:${port}/api/lab/password-storage`, { headers }),
    fetch(`http://127.0.0.1:${port}/api/lab/jwt-lifecycle`, { headers }),
    fetch(`http://127.0.0.1:${port}/api/lab/security-configuration`, { headers }),
    fetch(`http://127.0.0.1:${port}/api/lab/hardcoded-secrets`, { headers }),
  ]);

  assert.equal((await passwords.json()).storedValue, 'alice123');
  assert.equal((await jwt.json()).accessTokenExpires, false);
  assert.equal((await configuration.json()).cors, 'open');
  assert.equal((await secrets.json()).secretSource, 'source-code');
});

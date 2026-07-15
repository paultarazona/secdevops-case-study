'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { setTestEnv } = require('../testEnv');

const dbPath = setTestEnv('http-api');
fs.rmSync(dbPath, { force: true });

// Required after setTestEnv() so the app boots against the throwaway test
// database instead of the real one.
const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/db/connection');

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

test('register + login issues a working access token', async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'alice-http-test', password: 'alice-password-1' });

  assert.equal(registerRes.status, 201);
  assert.equal(registerRes.body.username, 'alice-http-test');

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'alice-http-test', password: 'alice-password-1' });

  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.token);
  assert.equal(loginRes.body.user.username, 'alice-http-test');
});

test('login with wrong password is rejected with a generic error', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'bad-login-user', password: 'correct-password' });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'bad-login-user', password: 'wrong-password' });

  assert.equal(res.status, 401);
});

test('resources require authentication', async () => {
  const res = await request(app).get('/api/resources/1');
  assert.equal(res.status, 401);
});

test('IDOR is mitigated: a user cannot access another user\'s resource by id', async () => {
  // Register and log in two separate users.
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'idor-owner', password: 'owner-password-1' });
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'idor-attacker', password: 'attacker-password-1' });

  const ownerLogin = await request(app)
    .post('/api/auth/login')
    .send({ username: 'idor-owner', password: 'owner-password-1' });
  const attackerLogin = await request(app)
    .post('/api/auth/login')
    .send({ username: 'idor-attacker', password: 'attacker-password-1' });

  const ownerToken = ownerLogin.body.token;
  const attackerToken = attackerLogin.body.token;

  // Owner creates a resource.
  const createRes = await request(app)
    .post('/api/resources')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ title: 'owner-only note', content: 'sensitive content' });

  assert.equal(createRes.status, 201);
  const resourceId = createRes.body.id;

  // Owner can read their own resource.
  const ownerRead = await request(app)
    .get(`/api/resources/${resourceId}`)
    .set('Authorization', `Bearer ${ownerToken}`);
  assert.equal(ownerRead.status, 200);
  assert.equal(ownerRead.body.title, 'owner-only note');

  // Attacker, authenticated as a different user, must NOT be able to read
  // the owner's resource by guessing/incrementing the id (mitigation #4).
  const attackerRead = await request(app)
    .get(`/api/resources/${resourceId}`)
    .set('Authorization', `Bearer ${attackerToken}`);
  assert.equal(attackerRead.status, 404);
});

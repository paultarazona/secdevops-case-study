'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.resolve(__dirname, '..', 'public');
const app = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
const index = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const en = JSON.parse(fs.readFileSync(path.join(publicDir, 'locales', 'en.json'), 'utf8'));
const es = JSON.parse(fs.readFileSync(path.join(publicDir, 'locales', 'es.json'), 'utf8'));

test('V1 keeps the locale dictionaries aligned for dynamic frontend copy', () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  for (const key of [
    'challenge_catalog',
    'progress_summary_initial',
    'file_upload_aria',
    'status_jwt_unexpected',
    'status_password_storage_unexpected',
    'status_configuration_verified',
    'status_secrets_verified',
  ]) {
    assert.ok(en[key], `English translation missing: ${key}`);
    assert.ok(es[key], `Spanish translation missing: ${key}`);
  }
});

test('V1 localizes accessibility copy, updates the document language, and handles every lesson action', () => {
  assert.match(index, /data-i18n-aria-label="challenge_catalog"/);
  assert.doesNotMatch(app, /File to upload for/);
  assert.match(app, /document\.documentElement\.lang = lang/);
  assert.match(app, /action === 'verify-security-configuration'/);
  assert.match(app, /action === 'verify-hardcoded-secrets'/);
  assert.doesNotMatch(app, /Expected the V1 lifecycle weakness\.|Expected plaintext storage evidence\./);
});

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const env = require('../config/env');

// Mitigation #7 (hardcoded secrets/config): the DB path comes from
// process.env.DB_PATH (see src/config/env.js), not a literal in source.
const DB_PATH = path.isAbsolute(env.DB_PATH)
  ? env.DB_PATH
  : path.join(__dirname, '..', '..', env.DB_PATH);

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Apply schema.sql on every boot (idempotent via CREATE TABLE IF NOT EXISTS)
// so `npm start` works from a clean checkout.
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

module.exports = db;

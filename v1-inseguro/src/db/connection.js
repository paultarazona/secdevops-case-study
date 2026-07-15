const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// VULNERABILITY #7 - Hardcoded secrets/config
// The DB file path is hardcoded directly in source instead of coming from an
// environment variable / config file. In a real app this would also be where
// DB credentials for a networked database would leak into source control.
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'v1-inseguro.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Apply schema.sql on every boot so the app can be started from scratch with
// just `npm start` (schema uses CREATE TABLE IF NOT EXISTS, so it's safe to
// re-run).
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

module.exports = db;

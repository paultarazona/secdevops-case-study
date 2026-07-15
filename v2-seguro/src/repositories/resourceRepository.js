const db = require('../db/connection');

// Mitigation #1 (SQL injection): parameterized queries only, including the
// `search` filter that v1 concatenated directly into the SQL string.

function listByUser(userId, search) {
  if (search) {
    return db
      .prepare('SELECT * FROM resources WHERE user_id = ? AND title LIKE ?')
      .all(userId, `%${search}%`);
  }
  return db.prepare('SELECT * FROM resources WHERE user_id = ?').all(userId);
}

function findById(id) {
  return db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
}

function create(userId, title, content) {
  const info = db
    .prepare('INSERT INTO resources (user_id, title, content) VALUES (?, ?, ?)')
    .run(userId, title, content ?? null);
  return findById(info.lastInsertRowid);
}

function update(id, title, content) {
  db.prepare(
    `UPDATE resources SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(title, content, id);
  return findById(id);
}

function remove(id) {
  db.prepare('DELETE FROM resources WHERE id = ?').run(id);
}

function setFilePath(id, filePath) {
  db.prepare(`UPDATE resources SET file_path = ?, updated_at = datetime('now') WHERE id = ?`).run(
    filePath,
    id
  );
  return findById(id);
}

module.exports = {
  listByUser,
  findById,
  create,
  update,
  remove,
  setFilePath,
};

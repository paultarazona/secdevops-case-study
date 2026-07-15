const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db/connection');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// VULNERABILITY #5 - Insecure file upload.
// - No file type / MIME / extension whitelist.
// - No file size limit.
// - The file is saved using the ORIGINAL uploaded filename, taken directly
//   from the client, and joined onto the uploads directory without any
//   sanitization. A filename such as `../../evil.js` traverses outside of
//   the intended uploads folder.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, file.originalname),
});
// `preservePath: true` disables busboy's built-in filename sanitization
// (which normally strips directory components via `path.basename`). This
// is set on purpose so the "original filename used as-is" vulnerability
// below is genuinely exploitable instead of being silently neutralized by
// the underlying multipart parser.
const upload = multer({ storage, preservePath: true });

// GET /api/resources - list resources of the authenticated user
router.get('/', (req, res) => {
  try {
    // VULNERABILITY #1 - SQL Injection via optional ?search= query param,
    // concatenated directly into the SQL string.
    const search = req.query.search;
    let query = `SELECT * FROM resources WHERE user_id = ${req.user.id}`;
    if (search) {
      query += ` AND title LIKE '%${search}%'`;
    }
    const rows = db.prepare(query).all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list resources', stack: err.stack });
  }
});

// GET /api/resources/:id - detail
// VULNERABILITY #4 - Broken Access Control (IDOR): any authenticated user
// can fetch ANY resource by id, there is no check that
// resource.user_id === req.user.id.
router.get('/:id', (req, res) => {
  try {
    const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    return res.json(resource);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch resource', stack: err.stack });
  }
});

// POST /api/resources - create
router.post('/', (req, res) => {
  const { title, content } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  try {
    const info = db
      .prepare('INSERT INTO resources (user_id, title, content) VALUES (?, ?, ?)')
      .run(req.user.id, title, content || null);
    const created = db.prepare('SELECT * FROM resources WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create resource', stack: err.stack });
  }
});

// PUT /api/resources/:id - update
// VULNERABILITY #4 - IDOR: no ownership check before updating.
router.put('/:id', (req, res) => {
  const { title, content } = req.body || {};
  try {
    const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    db.prepare(
      `UPDATE resources SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(title ?? resource.title, content ?? resource.content, req.params.id);
    const updated = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update resource', stack: err.stack });
  }
});

// DELETE /api/resources/:id - delete
// VULNERABILITY #4 - IDOR: no ownership check before deleting.
router.delete('/:id', (req, res) => {
  try {
    const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete resource', stack: err.stack });
  }
});

// POST /api/resources/:id/upload - upload attached file
// VULNERABILITY #4 - IDOR: no ownership check, any user can attach a file
// to any resource id.
// VULNERABILITY #5 - see multer config above (no whitelist, no size limit,
// original filename used as-is -> path traversal).
router.post('/:id/upload', upload.single('file'), (req, res) => {
  try {
    const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'file is required (multipart field "file")' });
    }
    db.prepare(`UPDATE resources SET file_path = ?, updated_at = datetime('now') WHERE id = ?`).run(
      req.file.filename,
      req.params.id
    );
    return res.status(201).json({
      message: 'File uploaded',
      filename: req.file.filename,
      path: req.file.path,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Upload failed', stack: err.stack });
  }
});

// GET /api/resources/:id/file - download attached file
// VULNERABILITY #4 - IDOR: no ownership check before serving the file.
// VULNERABILITY #5 - file_path from the DB (originally the raw uploaded
// filename) is joined onto the uploads dir without sanitization, so a
// traversal-crafted stored filename can serve files outside uploads/.
router.get('/:id/file', (req, res) => {
  try {
    const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
    if (!resource || !resource.file_path) {
      return res.status(404).json({ error: 'No file for this resource' });
    }
    const filePath = path.join(UPLOADS_DIR, resource.file_path);
    return res.download(filePath);
  } catch (err) {
    return res.status(500).json({ error: 'Download failed', stack: err.stack });
  }
});

module.exports = router;

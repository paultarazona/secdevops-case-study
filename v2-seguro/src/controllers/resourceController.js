const resourceService = require('../services/resourceService');
const uploadService = require('../services/uploadService');
const {
  createResourceSchema,
  updateResourceSchema,
  listResourcesQuerySchema,
} = require('../validators/resourceValidators');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function list(req, res, next) {
  const parsed = listResourcesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  try {
    const rows = resourceService.list(req.user.id, parsed.data.search);
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

// req.resource is already loaded + ownership-checked by
// middleware/authorize.js#loadOwnedResource for all :id routes below.
function getById(req, res) {
  return res.json(req.resource);
}

function create(req, res, next) {
  const parsed = createResourceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  try {
    const created = resourceService.create(req.user.id, parsed.data.title, parsed.data.content);
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
}

function update(req, res, next) {
  const parsed = updateResourceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  try {
    const updated = resourceService.update(
      req.user.id,
      req.resource.id,
      parsed.data.title,
      parsed.data.content
    );
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
}

function remove(req, res, next) {
  try {
    resourceService.remove(req.user.id, req.resource.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file is required (multipart field "file")' });
    }
    const { filename, mime } = await uploadService.saveValidatedFile(UPLOADS_DIR, req.file.buffer);
    const updated = resourceService.attachFile(req.user.id, req.resource.id, filename);
    return res.status(201).json({
      message: 'File uploaded',
      filename,
      mime,
      resource: updated,
    });
  } catch (err) {
    return next(err);
  }
}

function download(req, res, next) {
  try {
    const filename = resourceService.getFilePath(req.user.id, req.resource.id);
    const filePath = path.join(UPLOADS_DIR, filename);
    return res.download(filePath);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getById, create, update, remove, upload, download, UPLOADS_DIR };

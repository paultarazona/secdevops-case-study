const express = require('express');
const multer = require('multer');
const resourceController = require('../controllers/resourceController');
const { loadOwnedResource } = require('../middleware/authorize');
const env = require('../config/env');

const router = express.Router();

// Mitigation #5 (insecure upload): memory storage (no filename ever touches
// disk under client control), a hard size limit from env, and a single
// file per request. Content-based validation + server-generated filename
// happen in services/uploadService.js after this.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
});

// Routes are thin: parse/validate params, delegate to controller. Ownership
// (Mitigation #4 - IDOR) is enforced by loadOwnedResource for every route
// that touches a specific resource, BEFORE the controller runs.
router.get('/', resourceController.list);
router.post('/', resourceController.create);

router.get('/:id', loadOwnedResource, resourceController.getById);
router.put('/:id', loadOwnedResource, resourceController.update);
router.delete('/:id', loadOwnedResource, resourceController.remove);

router.post('/:id/upload', loadOwnedResource, upload.single('file'), resourceController.upload);
router.get('/:id/file', loadOwnedResource, resourceController.download);

module.exports = router;

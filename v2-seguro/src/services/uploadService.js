const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const { fromBuffer } = require('file-type');

// Mitigation #5 (insecure upload):
// - The stored filename is generated server-side with crypto.randomUUID()
//   (the client-supplied filename is NEVER used for anything other than
//   recovering an extension for display purposes), so path traversal via a
//   crafted filename (e.g. "../../evil.txt") is impossible.
// - The actual file content is inspected via magic-byte sniffing
//   (file-type), not the client-supplied MIME type or extension, which are
//   both trivially spoofable.
// - Size limiting is enforced by multer's `limits.fileSize` before this
//   service ever runs (see routes wiring / multer config).

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/pdf',
  'text/plain',
]);

class UploadError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function detectAndValidate(buffer) {
  const detected = await fromBuffer(buffer);

  if (detected) {
    if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
      throw new UploadError(`File type not allowed: ${detected.mime}`);
    }
    return detected.mime;
  }

  // file-type returns undefined for plain text / files with no recognizable
  // magic-byte signature. Only accept that as text/plain if it genuinely
  // looks like UTF-8 text (no embedded null bytes / binary junk).
  const looksLikeText = !buffer.subarray(0, 8000).includes(0);
  if (!looksLikeText) {
    throw new UploadError('File type could not be verified and is not plain text');
  }
  return 'text/plain';
}

function generateStoredFilename() {
  // Server-generated name only - never derived from client input.
  return crypto.randomUUID();
}

async function saveValidatedFile(uploadsDir, buffer) {
  const mime = await detectAndValidate(buffer);
  const filename = generateStoredFilename();
  const destination = path.join(uploadsDir, filename);

  // Defense in depth: confirm the resolved path still lives inside
  // uploadsDir before writing (guards against any future refactor that
  // reintroduces client-influenced paths).
  const resolved = path.resolve(destination);
  const resolvedDir = path.resolve(uploadsDir);
  if (!resolved.startsWith(resolvedDir + path.sep)) {
    throw new UploadError('Invalid upload destination', 500);
  }

  await fs.writeFile(resolved, buffer);
  return { filename, mime };
}

module.exports = { saveValidatedFile, UploadError, ALLOWED_MIME_TYPES };

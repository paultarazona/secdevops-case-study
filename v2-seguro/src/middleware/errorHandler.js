// Mitigation #6 (insecure config): centralized error handler. The real
// error (including stack trace) is logged server-side only; the client
// always receives a generic message with no stack trace, file paths, or
// library internals - unlike v1, which echoes err.stack in the JSON body.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Multer errors (e.g. file too large) come with a `code`, not `.status`.
  const isMulterError = err.name === 'MulterError';
  const status = err.status || (isMulterError ? 400 : 500);

  // eslint-disable-next-line no-console
  console.error(`[error] ${req.method} ${req.originalUrl} ->`, err);

  const message = status < 500 ? err.message : 'Internal server error';
  return res.status(status).json({ error: message });
}

function notFoundHandler(req, res) {
  return res.status(404).json({ error: 'Not found' });
}

module.exports = { errorHandler, notFoundHandler };

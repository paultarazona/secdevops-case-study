const resourceService = require('../services/resourceService');

// Mitigation #4 (IDOR): dedicated ownership-check middleware. It loads the
// resource by :id and verifies resource.user_id === req.user.id BEFORE any
// route handler runs. If the resource does not exist OR belongs to another
// user, it returns the same 404 either way - no information about other
// users' resources leaks through a distinguishable status code or message.
function loadOwnedResource(req, res, next) {
  try {
    const resource = resourceService.getOwned(req.user.id, Number(req.params.id));
    req.resource = resource;
    next();
  } catch (err) {
    if (err instanceof resourceService.ResourceError) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { loadOwnedResource };

const resourceRepository = require('../repositories/resourceRepository');

class ResourceError extends Error {
  constructor(message, status = 404) {
    super(message);
    this.status = status;
  }
}

// Mitigation #4 (IDOR): every operation here that touches a specific
// resource re-checks resource.user_id === userId before returning/mutating
// anything. Callers get the SAME 404 whether the resource does not exist at
// all or belongs to someone else, so existence of other users' resources is
// never leaked (see also middleware/authorize.js for the route-level gate).

function list(userId, search) {
  return resourceRepository.listByUser(userId, search);
}

function getOwned(userId, resourceId) {
  const resource = resourceRepository.findById(resourceId);
  if (!resource || resource.user_id !== userId) {
    throw new ResourceError('Resource not found', 404);
  }
  return resource;
}

function create(userId, title, content) {
  return resourceRepository.create(userId, title, content);
}

function update(userId, resourceId, title, content) {
  const resource = getOwned(userId, resourceId);
  return resourceRepository.update(
    resource.id,
    title ?? resource.title,
    content ?? resource.content
  );
}

function remove(userId, resourceId) {
  const resource = getOwned(userId, resourceId);
  resourceRepository.remove(resource.id);
}

function attachFile(userId, resourceId, storedFilename) {
  const resource = getOwned(userId, resourceId);
  return resourceRepository.setFilePath(resource.id, storedFilename);
}

function getFilePath(userId, resourceId) {
  const resource = getOwned(userId, resourceId);
  if (!resource.file_path) {
    throw new ResourceError('No file for this resource', 404);
  }
  return resource.file_path;
}

module.exports = { list, getOwned, create, update, remove, attachFile, getFilePath, ResourceError };

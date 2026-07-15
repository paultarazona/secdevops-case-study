const helmet = require('helmet');

// Mitigation #6 (insecure config): Helmet applies a solid set of default
// security headers (X-Content-Type-Options, X-Frame-Options, HSTS, a
// restrictive Content-Security-Policy, etc.) that v1 sends none of.
function buildHelmetMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  });
}

module.exports = buildHelmetMiddleware;

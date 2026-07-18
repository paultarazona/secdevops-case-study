'use strict';

// This file is served by both applications so lesson metadata cannot drift
// between V1 and V2. It contains instructional metadata, never real secrets.
window.LAB_CHALLENGES = [
  {
    id: 'sql-injection',
    title: 'SQL Injection',
    cwe: 'CWE-89',
    owasp: 'A03:2021 Injection',
    level: 'Foundation',
    available: true,
    objective: 'Observe how an untrusted login value changes a database query, then compare the protected behavior.',
    v1: 'V1 concatenates login values into SQL. The controlled local input can bypass the intended password check.',
    v2: 'V2 validates input and uses parameterized statements, so the same input cannot change query semantics.',
    evidence: 'A V1 sign-in succeeds with the guided local input. V2 rejects the equivalent request without exposing query details.',
  },
  {
    id: 'idor', title: 'Broken Access Control', cwe: 'CWE-639', owasp: 'A01:2021 Broken Access Control', level: 'Foundation', available: true,
    objective: 'Compare resource ownership enforcement between both versions.',
    v1: 'After signing in as Alice, V1 returns Bob\'s seeded resource when its identifier is requested.',
    v2: 'After signing in as Alice, V2 returns the same generic 404 for Bob\'s resource as it would for a missing resource.',
    evidence: 'The controlled request targets seeded resource #2. V1 returns it; V2 hides it with a generic not-found response.',
    action: 'verify-idor', actionLabel: 'Verify controlled resource access', targetResourceId: 2,
  },
  {
    id: 'upload-traversal', title: 'Unsafe File Upload', cwe: 'CWE-434', owasp: 'A05:2021 Security Misconfiguration', level: 'Foundation', available: true,
    objective: 'Learn why client filenames and content types cannot be trusted.',
    v1: 'V1 stores the supplied filename without a type or size policy, allowing a controlled traversal filename to reach the upload handler.',
    v2: 'V2 limits size, validates file content, generates a server filename, and stores it outside publicly served paths.',
    evidence: 'The controlled text upload uses a traversal-shaped filename. V1 accepts the client filename; V2 stores a server-generated filename instead.',
    action: 'verify-upload', actionLabel: 'Verify controlled file handling', targetResourceId: 1,
  },
  {
    id: 'password-storage', title: 'Password Storage', cwe: 'CWE-256', owasp: 'A02:2021 Cryptographic Failures', level: 'Core', available: true,
    objective: 'Inspect the impact of storing passwords without a password hash.',
    v1: 'V1 stores and returns the authenticated user\'s password value as plaintext in this local-only evidence route.',
    v2: 'V2 confirms bcrypt with 12 rounds and never returns the password hash to the client.',
    evidence: 'The same authenticated lab request returns a plaintext value in V1 and policy-only evidence in V2.',
    action: 'verify-password-storage', actionLabel: 'Inspect storage evidence',
  },
  {
    id: 'jwt-lifecycle', title: 'JWT Lifecycle', cwe: 'CWE-798', owasp: 'A02:2021 Cryptographic Failures', level: 'Core', available: true,
    objective: 'Compare token signing, expiry, verification, and refresh behavior.',
    v1: 'V1 signs tokens without an expiry and does not pin a verification algorithm or rotate refresh tokens.',
    v2: 'V2 uses short-lived access tokens, pins HS256, keeps a separate refresh secret, and rotates refresh tokens.',
    evidence: 'The authenticated lab endpoint reports the active lifecycle policy without returning signing secrets.',
    action: 'verify-jwt-lifecycle', actionLabel: 'Inspect token lifecycle evidence',
  },
  {
    id: 'security-configuration', title: 'Security Configuration', cwe: 'CWE-209', owasp: 'A05:2021 Security Misconfiguration', level: 'Core', available: true,
    objective: 'Inspect headers, CORS, rate limits, and error boundaries as security controls.',
    v1: 'V1 leaves CORS open, omits security headers and auth throttling, and exposes error details.',
    v2: 'V2 restricts CORS, applies Helmet, rate-limits authentication, and keeps internal errors server-side.',
    evidence: 'The authenticated lab endpoint reports configuration control state without exposing environment values.',
    action: 'verify-security-configuration', actionLabel: 'Inspect configuration evidence',
  },
  {
    id: 'hardcoded-secrets', title: 'Hardcoded Secrets', cwe: 'CWE-798', owasp: 'A02:2021 Cryptographic Failures', level: 'Core', available: true,
    objective: 'Trace the difference between committed secrets and environment-based configuration.',
    v1: 'V1 keeps its signing secret and application configuration in source code, making them available to anyone with repository access.',
    v2: 'V2 reads secrets and operational configuration from environment variables; evidence never returns their values.',
    evidence: 'The lab reports the configuration source and whether a secret would be exposed, without displaying a secret.',
    action: 'verify-hardcoded-secrets', actionLabel: 'Inspect secret handling evidence',
  },
];

window.LAB_GUIDED_LOGIN = {
  username: "' OR '1'='1' -- ",
  password: 'unused',
};

// VULNERABILITY #3 / #7 - Hardcoded secrets in source code.
// This should come from an environment variable (process.env.JWT_SECRET) and
// never be committed to source control. Here it is a plain string literal
// baked into the repository on purpose, for the case study.
module.exports = {
  JWT_SECRET: 'super-secret-key-v1-inseguro-2024',
};

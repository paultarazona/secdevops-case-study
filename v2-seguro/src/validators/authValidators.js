const { z } = require('zod');

// Mitigation #1 (SQL injection) / general input hardening: every input from
// the client is validated and constrained (type, length, charset) before it
// ever reaches a repository/query, in addition to parameterized queries.

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'username must be at least 3 characters')
    .max(32, 'username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'username may only contain letters, numbers, _ . -'),
  password: z.string().min(8, 'password must be at least 8 characters').max(128),
});

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

module.exports = { registerSchema, loginSchema, refreshSchema };

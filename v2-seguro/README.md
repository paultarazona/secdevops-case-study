# v2-seguro

Hardened/SecDevOps version of the case-study app. It implements the exact
same feature set and API surface as `v1-inseguro` (auth, resource CRUD, file
upload/download), but every vulnerability that `v1-inseguro` intentionally
ships is mitigated here with a real, layered-architecture implementation
(routes → controllers → services → repositories), not a copy-paste patch.

## Stack

- Node.js + Express
- SQLite via `better-sqlite3` (parameterized queries only)
- JWT via `jsonwebtoken@^9.x` (patched, see "Fixed dependency" below)
- `bcrypt` for password hashing
- `zod` for input validation
- `helmet`, `cors`, `express-rate-limit` for transport-level hardening
- `multer` (memory storage) + `file-type` for upload content validation

## Architecture

```
/src
  /config        env loading, helmet config, cors config
  /db            schema.sql, connection.js, seed.js
  /routes        auth.js, resources.js - thin, delegate to controllers
  /controllers   request/response handling
  /services      business logic (auth, resources, upload validation)
  /repositories  data access - parameterized queries only
  /middleware    auth.js, authorize.js (ownership check), errorHandler.js, rateLimiter.js
  /validators    Zod schemas for every input
  /uploads       outside any publicly-served static path
app.js, server.js
```

Request flow: `routes` parse the URL/verb and wire middleware only → `controllers`
validate input (via `validators`) and shape the HTTP response → `services` hold
business rules (ownership checks, password hashing, token issuance, upload
validation) → `repositories` are the only layer that touches the database,
exclusively through parameterized `better-sqlite3` statements.

## Running it

```bash
cd v2-seguro
cp .env.example .env      # edit values if needed, especially secrets
npm install
npm run seed               # creates data/v2-seguro.db, applies schema.sql, inserts test users
npm start                  # listens on http://localhost:43172 (or $PORT)
```

Seeded users (bcrypt-hashed passwords, see mitigation #2):

| username | password |
|---|---|
| alice | alice123 |
| bob | bob123 |

Each seeded user owns one private resource, useful for demonstrating that the
IDOR exploit from v1 no longer works here.

### Docker

From the repository root:

```bash
docker build -f v2-seguro/Dockerfile -t v2-seguro .
docker run -p 3000:3000 --env-file .env v2-seguro
```

The container does not run the seed script automatically; exec into it and
run `npm run seed`, or hit `/api/auth/register` to create your own user.

## Environment variables

See `.env.example` for the full list with placeholder values. Summary:

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port the server listens on |
| `NODE_ENV` | `development` / `production` |
| `CORS_ORIGIN` | Single explicit allowed origin (never `*`) |
| `JWT_SECRET` | Signing secret for access tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (default `15m`) |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens (separate from access) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (default `7d`) |
| `DB_PATH` | SQLite file path |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Login/register brute-force throttling |
| `UPLOAD_MAX_BYTES` | Max accepted upload size |

`.env` is git-ignored; never commit real secrets. Generate strong secrets with
e.g. `openssl rand -hex 32`.

## API surface (identical to v1)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh   (new: rotates a server-tracked refresh token)

GET    /api/resources
GET    /api/resources/:id
POST   /api/resources
PUT    /api/resources/:id
DELETE /api/resources/:id

POST   /api/resources/:id/upload
GET    /api/resources/:id/file
```

All `/api/resources*` routes require `Authorization: Bearer <token>`.

## Mitigations: v1 vulnerability → v2 defense

| # | v1 vulnerability | v2 mitigation | Where |
|---|---|---|---|
| 1 | SQL Injection via string-concatenated queries (login, `?search=`) | Every query uses `better-sqlite3` `.prepare()` with `?` placeholders; all inputs additionally validated with Zod before reaching a repository | `src/repositories/*.js`, `src/validators/*.js` |
| 2 | Plaintext password storage | `bcrypt.hash` (12 rounds, auto-salted) on register, `bcrypt.compare` on login; raw password never stored or returned | `src/services/authService.js`, `src/db/seed.js` |
| 3 | Insecure JWT: hardcoded secret, no expiry, no algorithm pinning | `JWT_SECRET`/`JWT_REFRESH_SECRET` from env, `expiresIn: '15m'` + explicit `algorithm: 'HS256'` on sign, `algorithms: ['HS256']` pinned on verify, plus a real server-tracked, rotating refresh token via `/api/auth/refresh` | `src/services/authService.js`, `src/middleware/auth.js`, `src/repositories/refreshTokenRepository.js` |
| 4 | IDOR: any authenticated user can read/write/delete/upload/download any resource by id | Dedicated `authorize.js` middleware loads the resource and checks `resource.user_id === req.user.id` before every route touching a specific resource; same generic 404 whether the resource doesn't exist or belongs to someone else | `src/middleware/authorize.js`, `src/services/resourceService.js` |
| 5 | Insecure upload: no MIME/size validation, client filename used as-is → path traversal | Multer memory storage with a size limit; actual file content sniffed via magic bytes (`file-type`), not client MIME/extension; stored filename always generated server-side with `crypto.randomUUID()`; files live in `src/uploads/`, outside any static path | `src/routes/resources.js`, `src/services/uploadService.js` |
| 6 | Open CORS (`*`), no Helmet, stack traces leaked in errors, no rate limiting | `helmet()` with a restrictive CSP; CORS locked to a single origin from env; centralized error handler logs the real error server-side and returns a generic message (no stack trace) to the client; `express-rate-limit` on `/api/auth/login`, `/register`, `/refresh` | `src/app.js`, `src/config/helmet.js`, `src/config/cors.js`, `src/middleware/errorHandler.js`, `src/middleware/rateLimiter.js` |
| 7 | Hardcoded secrets/config in source | All config (`JWT_SECRET`, `JWT_REFRESH_SECRET`, DB path, port, CORS origin, rate-limit settings, upload size limit) read from `process.env` via `dotenv`; `.env.example` ships placeholders only; `.env` is git-ignored | `src/config/env.js`, `.env.example`, `.gitignore` |

## Fixed dependency

`jsonwebtoken` is pinned to `^9.x` (vs. v1's `8.5.1`, vulnerable to
CVE-2022-23529 / GHSA-qwph-4952-7xr6 and related advisories GHSA-8cf7-32gw-wr33,
GHSA-hjrf-2m68-5959). `npm audit` on this package.json shows **no finding for
`jsonwebtoken`**, confirming the fix (compare against `v1-inseguro`'s `npm audit`,
which flags it as high severity).

## What this README is for

Reference documentation for the student/instructor building and grading the
case study - a defense-side checklist mirroring `v1-inseguro/README.md`'s
vulnerability list.

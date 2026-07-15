const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');
const env = require('../config/env');

const BCRYPT_ROUNDS = 12;

class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

// Mitigation #2 (plaintext passwords): bcrypt with an auto-generated salt
// on register, bcrypt.compare on login. The raw password is never stored or
// returned.
async function register(username, password) {
  const existing = userRepository.findByUsername(username);
  if (existing) {
    throw new AuthError('Username already taken', 409);
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = userRepository.create(username, passwordHash);
  return { id: user.id, username: user.username };
}

function issueAccessToken(user) {
  // Mitigation #3 (insecure JWT): secret from env, explicit algorithm,
  // short expiry.
  return jwt.sign({ id: user.id, username: user.username }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

function issueRefreshToken(user) {
  const refreshToken = jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    algorithm: 'HS256',
  });
  const decoded = jwt.decode(refreshToken);
  const expiresAtIso = new Date(decoded.exp * 1000).toISOString();
  refreshTokenRepository.store(user.id, refreshToken, expiresAtIso);
  return refreshToken;
}

async function login(username, password) {
  const user = userRepository.findByUsername(username);
  // Generic message either way: do not reveal whether the username exists.
  if (!user) {
    throw new AuthError('Invalid credentials', 401);
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AuthError('Invalid credentials', 401);
  }

  const accessToken = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username },
  };
}

// Mitigation #3 (insecure JWT) - refresh flow: rotate the refresh token on
// every use and verify it against the server-side record (allows revocation,
// unlike a bare stateless long-lived token).
function refresh(refreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    throw new AuthError('Invalid or expired refresh token', 401);
  }

  const stored = refreshTokenRepository.findValid(refreshToken);
  if (!stored) {
    throw new AuthError('Invalid or expired refresh token', 401);
  }

  const user = userRepository.findById(decoded.id);
  if (!user) {
    throw new AuthError('Invalid or expired refresh token', 401);
  }

  // Rotate: revoke the used refresh token and issue a fresh pair.
  refreshTokenRepository.revoke(refreshToken);
  const accessToken = issueAccessToken(user);
  const newRefreshToken = issueRefreshToken(user);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: { id: user.id, username: user.username },
  };
}

module.exports = { register, login, refresh, AuthError };

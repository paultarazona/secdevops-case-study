const authService = require('../services/authService');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/authValidators');

async function register(req, res, next) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  try {
    const user = await authService.register(parsed.data.username, parsed.data.password);
    return res.status(201).json(user);
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  try {
    const result = await authService.login(parsed.data.username, parsed.data.password);
    return res.json({
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    return next(err);
  }
}

function refresh(req, res, next) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  try {
    const result = authService.refresh(parsed.data.refreshToken);
    return res.json({
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, refresh };

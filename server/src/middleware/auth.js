const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.warn('[SECURITY] JWT_SECRET env var is not set — using insecure default. Set JWT_SECRET before deploying.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };

// Authentication module (CommonJS)
// Session-based authentication with login page

const { Router } = require('express');
const crypto = require('crypto');
const { normalizeSafeString } = require('./validation');

const LOGIN_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const LOGIN_RATE_LIMIT_MAX = 10;
const loginRateLimiter = new Map(); // ip -> { count, resetAt }

// Periodic cleanup of stale rate limiter entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginRateLimiter) {
    if (now >= entry.resetAt) {
      loginRateLimiter.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Store password without case folding (case-sensitive comparison)
const PASSWORD = normalizeSafeString(process.env.APP_PASSWORD || '');

function createAuthRouter() {
  const router = Router();

  // Login route (must be before auth middleware)
  router.post('/login', (req, res) => {
    const now = Date.now();
    const ip = req.ip || 'unknown';
    const entry = loginRateLimiter.get(ip);
    if (entry && now < entry.resetAt) {
      entry.count += 1;
      if (entry.count > LOGIN_RATE_LIMIT_MAX) {
        res.set('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
        return res.status(429).json({ success: false, message: 'Too many attempts. Try again soon.' });
      }
    } else {
      loginRateLimiter.set(ip, { count: 1, resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS });
    }

    const { password } = req.body;
    const providedPassword = normalizeSafeString(password || '');

    // Timing-safe comparison to prevent timing attacks
    const passwordsMatch = providedPassword.length > 0 &&
      providedPassword.length === PASSWORD.length &&
      crypto.timingSafeEqual(Buffer.from(providedPassword), Buffer.from(PASSWORD));

    if (passwordsMatch) {
      req.session.authenticated = true;
      loginRateLimiter.delete(ip);
      // Explicitly save session before responding to ensure cookie is set
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ success: false, message: 'Session error' });
        }
        res.json({ success: true });
      });
      return;
    } else {
      res.status(401).json({ success: false, message: 'Incorrect password' });
    }
  });

  return router;
}

// Auth middleware - protect all routes except login
function authMiddleware(req, res, next) {
  // Allow access to login page, login endpoint, health check, and static assets needed for login
  if (req.path === '/login.html' ||
      req.path === '/login' ||
      req.path === '/health' ||
      req.path.startsWith('/css/') ||
      req.path.startsWith('/fonts/')) {
    return next();
  }

  // Check if user is authenticated
  if (req.session && req.session.authenticated) {
    return next();
  }

  // Redirect to login page
  res.redirect('/login.html');
}

// Check if a session is authenticated (for WebSocket upgrade)
function isSessionAuthenticated(session) {
  return session && session.authenticated === true;
}

module.exports = {
  createAuthRouter,
  authMiddleware,
  isSessionAuthenticated,
};

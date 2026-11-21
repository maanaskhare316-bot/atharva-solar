/**
 * Atharva Enterprises - Secure Authentication & Session Management Module
 * Uses Native Node.js crypto (PBKDF2 with SHA-512 and unique salt)
 */

const crypto = require('node:crypto');
const { db } = require('./db');

// In-memory active session tokens map (token -> { userId, email, role, expiresAt })
const activeSessions = new Map();

// Session TTL: 8 hours
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// Rate limiting map: ip -> { attempts: number, firstAttemptTime: number, lockedUntil: number }
const loginRateLimits = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;  // 15 minutes lockout

/**
 * Check if an IP is rate limited
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginRateLimits.get(ip);
  if (!entry) {
    return { allowed: true };
  }

  // Check if locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingSecs = Math.ceil((entry.lockedUntil - now) / 1000);
    const remainingMins = Math.ceil(remainingSecs / 60);
    return {
      allowed: false,
      retryAfterMinutes: remainingMins,
      retryAfterSeconds: remainingSecs
    };
  }

  // Reset if window passed
  if (now - entry.firstAttemptTime > RATE_LIMIT_WINDOW_MS) {
    loginRateLimits.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt
 */
function recordFailedLogin(ip) {
  const now = Date.now();
  let entry = loginRateLimits.get(ip);
  if (!entry || (now - entry.firstAttemptTime > RATE_LIMIT_WINDOW_MS)) {
    entry = { attempts: 1, firstAttemptTime: now, lockedUntil: 0 };
  } else {
    entry.attempts += 1;
    if (entry.attempts >= MAX_FAILED_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
  }
  loginRateLimits.set(ip, entry);
}

/**
 * Reset failed login attempts on success
 */
function resetLoginAttempts(ip) {
  loginRateLimits.delete(ip);
}

/**
 * Generate PBKDF2 hash with random salt (100,000 iterations, SHA-512)
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2:${salt}:${derivedKey}`;
}

/**
 * Verify password against stored hash (supports PBKDF2 and legacy SHA256 migration)
 */
function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  // New PBKDF2 format: "pbkdf2:salt:derivedKey"
  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, expectedHash] = parts;
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(expectedHash, 'hex'));
    } catch {
      return false;
    }
  }

  // Legacy SHA256 fallback with timing-safe comparison
  const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sha256Hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Authenticate admin with email and password
 */
function authenticate(email, password, ip = 'unknown') {
  if (!email || !password) return { success: false, error: 'Email and password required' };

  // Check rate limit
  const rateLimitStatus = checkRateLimit(ip);
  if (!rateLimitStatus.allowed) {
    return {
      success: false,
      locked: true,
      error: `Too many failed login attempts. Account temporarily locked for ${rateLimitStatus.retryAfterMinutes} minute(s).`
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT id, email, password_hash, name, role FROM admin_users WHERE LOWER(email) = ?').get(cleanEmail);

  if (!user || !verifyPassword(password, user.password_hash)) {
    recordFailedLogin(ip);
    return { success: false, error: 'Invalid email address or password' };
  }

  // If password was using legacy SHA256, upgrade seamlessly to PBKDF2
  if (!user.password_hash.startsWith('pbkdf2:')) {
    const newPbkdf2Hash = hashPassword(password);
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(newPbkdf2Hash, user.id);
  }

  // Reset rate limits on successful auth
  resetLoginAttempts(ip);

  // Generate cryptographically secure session token
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  activeSessions.set(token, session);

  return { success: true, token, user: session };
}

/**
 * Validate an incoming authorization header token
 */
function validateSession(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

/**
 * Terminate a session
 */
function revokeSession(token) {
  if (token) {
    activeSessions.delete(token);
  }
}

/**
 * Change Admin Password
 */
function changePassword(userId, oldPassword, newPassword) {
  const user = db.prepare('SELECT id, password_hash FROM admin_users WHERE id = ?').get(userId);
  if (!user) return false;

  if (!verifyPassword(oldPassword, user.password_hash)) {
    return false;
  }

  const newHash = hashPassword(newPassword);
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(newHash, userId);
  return true;
}

module.exports = {
  authenticate,
  validateSession,
  revokeSession,
  changePassword,
  hashPassword,
  verifyPassword,
  checkRateLimit
};

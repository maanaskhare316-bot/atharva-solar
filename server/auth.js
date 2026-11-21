/**
 * Atharva Enterprises - Secure Authentication & Session Management Module
 * Uses Native Node.js crypto (PBKDF2 with SHA-512 and unique salt)
 */

const crypto = require('node:crypto');
const { db } = require('./db');

// Persistent Secret for Stateless Cryptographic Session Tokens across Serverless / Multi-Instance Deployments
const SESSION_SECRET = process.env.SESSION_SECRET || 'atharva_solar_super_secure_session_secret_2026_mp_india_turnkey';

// In-memory active session tokens map (token -> { userId, email, role, expiresAt }) & revocation set
const activeSessions = new Map();
const revokedSessions = new Set();

// Session TTL: 8 hours
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * Generate a stateless HMAC-signed cryptographic session token
 * Safe across serverless cold-starts and multiple lambda instances
 */
function createSessionToken(session) {
  const payloadB64 = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Parse and verify a stateless HMAC-signed session token
 */
function parseAndVerifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!session || typeof session !== 'object') return null;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

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

  // Generate cryptographically secure stateless HMAC session token (persists across all serverless instances)
  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  const token = createSessionToken(session);
  activeSessions.set(token, session);

  return { success: true, token, user: session };
}

/**
 * Validate an incoming authorization header token
 * Supports stateless HMAC verification (serverless-proof) & in-memory fallback
 */
function validateSession(token) {
  if (!token) return null;
  if (revokedSessions.has(token)) return null;

  // 1. Stateless HMAC cryptographic token verification
  if (token.includes('.')) {
    return parseAndVerifySessionToken(token);
  }

  // 2. In-memory fallback (for legacy hex tokens)
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
    revokedSessions.add(token);
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

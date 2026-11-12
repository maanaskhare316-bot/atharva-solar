/**
 * Atharva Enterprises - Authentication Module
 */

const crypto = require('node:crypto');
const { db } = require('./db');

// In-memory active session tokens map (token -> { userId, email, role, expiresAt })
const activeSessions = new Map();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hash password with SHA256
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Authenticate admin with email and password
 */
function authenticate(email, password) {
  if (!email || !password) return null;
  const hash = hashPassword(password);
  const user = db.prepare('SELECT id, email, name, role FROM admin_users WHERE LOWER(email) = LOWER(?) AND password_hash = ?').get(email.trim(), hash);
  if (!user) return null;

  // Generate secure random token
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  activeSessions.set(token, session);

  return { token, user: session };
}

/**
 * Validate an incoming authorization header or cookie token
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
  const oldHash = hashPassword(oldPassword);
  const user = db.prepare('SELECT id FROM admin_users WHERE id = ? AND password_hash = ?').get(userId, oldHash);
  if (!user) return false;

  const newHash = hashPassword(newPassword);
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(newHash, userId);
  return true;
}

module.exports = {
  authenticate,
  validateSession,
  revokeSession,
  changePassword,
  hashPassword
};

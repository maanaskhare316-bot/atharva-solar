/**
 * Atharva Enterprises - Request Validation & Security Utilities
 */

const crypto = require('node:crypto');

/**
 * Validate Email Address according to standard format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  // Standard RFC 5322 regex
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(trimmed);
}

/**
 * Sanitize untrusted text inputs (strip control characters and HTML entities)
 */
function sanitizeText(str, maxLen = 500) {
  if (str === null || str === undefined) return '';
  let cleaned = String(str)
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case "'": return '&#39;';
        case '"': return '&quot;';
        case '&': return '&amp;';
        default: return char;
      }
    })
    .replace(/[\x00-\x1F\x7F]/g, '') // Strip control characters
    .trim();
  return cleaned.slice(0, maxLen);
}

/**
 * Generate an unpredictable, crypto-secure booking reference ID
 * e.g. AE-MTG-A9E4-2C71
 */
function generateSecureRefNumber(prefix = 'AE-MTG') {
  const bytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  const part1 = bytes.slice(0, 4);
  const part2 = bytes.slice(4, 8);
  return `${prefix}-${part1}-${part2}`;
}

/**
 * Standard Available Meeting Time Slots
 */
const STANDARD_TIME_SLOTS = [
  '10:00 AM - 11:00 AM',
  '11:30 AM - 12:30 PM',
  '02:00 PM - 03:00 PM',
  '03:30 PM - 04:30 PM',
  '05:00 PM - 06:00 PM'
];

/**
 * Allowed Online Meeting Types
 */
const MEETING_TYPES = {
  solar_consultation: 'Solar Consultation',
  rooftop_discussion: 'Rooftop Solar Installation Discussion',
  subsidy_guidance: 'Subsidy Guidance',
  technical_support: 'Technical Support',
  general_enquiry: 'General Business Enquiry'
};

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];

module.exports = {
  isValidEmail,
  sanitizeText,
  generateSecureRefNumber,
  STANDARD_TIME_SLOTS,
  MEETING_TYPES,
  VALID_STATUSES
};

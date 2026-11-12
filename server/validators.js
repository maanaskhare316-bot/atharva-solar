/**
 * Atharva Enterprises - Request Validation & Helper Utilities
 */

/**
 * Validate Indian Mobile Number (10 digits, optionally starting with +91 or 0)
 */
function isValidIndianPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Matches +9198XXXXXXXX, 9198XXXXXXXX, 098XXXXXXXX, 98XXXXXXXX
  const regex = /^(?:\+?91|0)?[6-9]\d{9}$/;
  return regex.test(cleaned);
}

/**
 * Normalize phone number to standard Indian format: +91 XXXXX XXXXX
 */
function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  if (last10.length === 10) {
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return phone.trim();
}

/**
 * Extract bare 12-digit Indian number for WhatsApp link (e.g. 919039005531)
 */
function getWhatsAppDigits(phone) {
  if (!phone) return '919039005531';
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  return `91${last10}`;
}

/**
 * Generate a unique human-friendly reference number
 * e.g. AE-APT-4921, AE-ENQ-9102
 */
function generateRefNumber(prefix = 'AE') {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const yearShort = now.getFullYear().toString().slice(-2);
  return `${prefix}-${yearShort}${randomSuffix}`;
}

/**
 * Standard Available Time Slots
 */
const STANDARD_TIME_SLOTS = [
  '10:00 AM - 11:30 AM',
  '11:30 AM - 01:00 PM',
  '02:00 PM - 03:30 PM',
  '03:30 PM - 05:00 PM',
  '05:00 PM - 06:30 PM'
];

module.exports = {
  isValidIndianPhone,
  formatPhone,
  getWhatsAppDigits,
  generateRefNumber,
  STANDARD_TIME_SLOTS
};

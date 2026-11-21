/**
 * Atharva Enterprises - Core Web Server & REST API
 * Native Node.js HTTP Server + SQLite + RESTful API
 * Upgraded Secure Online Meeting Booking Architecture
 */

const http = require('node:http');
const url = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const { db, getSettings, updateSetting, recordVisit, getVisitorAnalytics } = require('./db');
const { authenticate, validateSession, revokeSession, changePassword, checkRateLimit } = require('./auth');
const {
  isValidEmail,
  sanitizeText,
  generateSecureRefNumber,
  STANDARD_TIME_SLOTS,
  MEETING_TYPES,
  VALID_STATUSES
} = require('./validators');
const {
  generateGoogleMeetUrl,
  sendBookingReceivedEmail,
  sendMeetingApprovedEmail
} = require('./email');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// Rate limiter for public status lookups (IP -> { count, resetTime })
const lookupRateLimits = new Map();

/**
 * Apply Comprehensive Security Headers to all responses
 */
function addSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; frame-ancestors 'none';"
  );
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
}

/**
 * Extract Client IP safely
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Helper to parse JSON body with strict size limit
 */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // 1MB max payload limit
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response with security headers
 */
function sendJSON(res, statusCode, data) {
  addSecurityHeaders(res);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

/**
 * Helper to get Auth User
 */
function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return validateSession(token);
}

/**
 * Mask customer name for privacy (e.g. "Rajesh Sharma" -> "Rajesh S.")
 */
function maskCustomerName(fullName) {
  if (!fullName) return 'Customer';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

/**
 * Solar Subsidy & Savings Calculator Logic (PM Surya Ghar Muft Bijli Yojana aligned)
 */
function calculateSolarPlan(monthlyBill) {
  const bill = parseFloat(monthlyBill) || 3000;
  // Average tariff in MP: approx ₹7.5 per unit
  const estimatedUnitsPerMonth = bill / 7.5;
  const unitsPerDay = estimatedUnitsPerMonth / 30;

  // 1 kW generates approx 4 units per day in Central India (MP average)
  let recommendedKw = unitsPerDay / 4;
  recommendedKw = Math.max(1, Math.round(recommendedKw * 2) / 2);

  // Roof space needed: ~80 to 100 sq.ft per kW
  const roofAreaSqFt = Math.round(recommendedKw * 95);

  // Government Subsidy Calculation
  let subsidyAmount = 0;
  if (recommendedKw >= 3) {
    subsidyAmount = 78000;
  } else if (recommendedKw >= 2) {
    subsidyAmount = 60000;
  } else if (recommendedKw >= 1) {
    subsidyAmount = 30000;
  }

  const benchmarkCostPerKw = 60000;
  const estimatedGrossCost = Math.round(recommendedKw * benchmarkCostPerKw);
  const netEstimatedCost = Math.max(0, estimatedGrossCost - subsidyAmount);

  const annualSavings = Math.round(recommendedKw * 4 * 365 * 7.5);
  const paybackPeriodYears = (netEstimatedCost / Math.max(annualSavings, 1)).toFixed(1);
  const lifetime25YearSavings = Math.round((annualSavings * 25) - netEstimatedCost);

  return {
    monthlyBill: bill,
    recommendedCapacityKw: recommendedKw,
    roofAreaSqFt,
    estimatedGrossCost,
    subsidyAmount,
    netEstimatedCost,
    annualSavings,
    paybackPeriodYears,
    lifetime25YearSavings,
    annualGenerationUnits: Math.round(recommendedKw * 4 * 365),
    co2OffsetTonnesAnnual: (recommendedKw * 1.3).toFixed(1)
  };
}

/**
 * Main HTTP Request Handler
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();
  const clientIp = getClientIp(req);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    addSecurityHeaders(res);
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    });
    return res.end();
  }

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // 1. Health Check
  if (pathname === '/api/health' && method === 'GET') {
    return sendJSON(res, 200, {
      status: 'healthy',
      app: 'Atharva Enterprises Solar Web App',
      secureBooking: true,
      timestamp: new Date().toISOString()
    });
  }

  // 2. Settings & Company Info (Filtered: zero private contact details in public GET)
  if (pathname === '/api/settings') {
    if (method === 'GET') {
      const allSettings = getSettings();
      // Whitelist only safe public settings
      const safePublicKeys = [
        'company_name',
        'tagline',
        'business_description',
        'market',
        'office_address',
        'pwd_license_info',
        'subsidy_deadline',
        'subsidy_max_amount',
        'subsidy_disclaimer',
        'meeting_platform',
        'booking_advance_days'
      ];
      const settings = {};
      for (const k of safePublicKeys) {
        if (allSettings[k] !== undefined) {
          settings[k] = allSettings[k];
        }
      }
      return sendJSON(res, 200, { success: true, settings });
    }

    if (method === 'POST' || method === 'PUT') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      const body = await parseRequestBody(req);
      for (const [key, val] of Object.entries(body)) {
        // Disallow setting public phone/whatsapp
        if (['phone', 'whatsapp', 'whatsapp_digits'].includes(key)) continue;
        updateSetting(key, sanitizeText(String(val), 1000));
      }
      return sendJSON(res, 200, { success: true, message: 'Settings updated successfully' });
    }
  }

  // 3. Brands List & Management
  if (pathname === '/api/brands') {
    if (method === 'GET') {
      const rows = db.prepare('SELECT * FROM brands ORDER BY display_order ASC').all();
      const brands = rows.map(b => ({
        ...b,
        features: b.features ? JSON.parse(b.features) : []
      }));
      return sendJSON(res, 200, { success: true, brands });
    }
  }

  if (pathname.startsWith('/api/brands/') && method === 'PATCH') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

    const brandId = parseInt(pathname.split('/')[3], 10);
    const body = await parseRequestBody(req);
    if (body.available !== undefined) {
      db.prepare('UPDATE brands SET available = ? WHERE id = ?').run(body.available ? 1 : 0, brandId);
    }
    if (body.tagline !== undefined) {
      db.prepare('UPDATE brands SET tagline = ? WHERE id = ?').run(sanitizeText(body.tagline, 200), brandId);
    }
    return sendJSON(res, 200, { success: true, message: 'Brand updated' });
  }

  // 4. Services List
  if (pathname === '/api/services' && method === 'GET') {
    const rows = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY display_order ASC').all();
    const services = rows.map(s => ({
      ...s,
      benefits: s.benefits ? JSON.parse(s.benefits) : []
    }));
    return sendJSON(res, 200, { success: true, services });
  }

  // 5. Solar Calculator Endpoint
  if (pathname === '/api/calculator' && method === 'POST') {
    const body = await parseRequestBody(req);
    const result = calculateSolarPlan(body.monthlyBill);
    return sendJSON(res, 200, { success: true, result });
  }

  // 6. Available Time Slots for Meeting Date
  if (pathname === '/api/slots/available' && method === 'GET') {
    const date = parsedUrl.query.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendJSON(res, 400, { error: 'Query parameter date (YYYY-MM-DD) is required' });
    }

    // Check if entire date is blocked
    const dayBlocked = db.prepare("SELECT id, reason FROM blocked_slots WHERE block_date = ? AND (time_slot IS NULL OR time_slot = '')").get(date);
    if (dayBlocked) {
      return sendJSON(res, 200, {
        date,
        isBlocked: true,
        reason: dayBlocked.reason || 'This date is not available for online meetings',
        availableSlots: []
      });
    }

    // Get blocked specific slots
    const blockedSlots = db.prepare('SELECT time_slot FROM blocked_slots WHERE block_date = ? AND time_slot IS NOT NULL').all(date).map(r => r.time_slot);

    // Get already booked appointments (status != 'cancelled' and status != 'rejected')
    const bookedAppointments = db.prepare(`
      SELECT time_slot FROM appointments
      WHERE appointment_date = ? AND status IN ('pending', 'confirmed')
    `).all(date).map(r => r.time_slot);

    const unavailable = new Set([...blockedSlots, ...bookedAppointments]);
    const availableSlots = STANDARD_TIME_SLOTS.filter(slot => !unavailable.has(slot));

    return sendJSON(res, 200, {
      date,
      isBlocked: false,
      availableSlots,
      allSlots: STANDARD_TIME_SLOTS.map(slot => ({
        slot,
        isAvailable: !unavailable.has(slot),
        reason: unavailable.has(slot) ? 'Reserved' : 'Available'
      }))
    });
  }

  // 7. Customer Online Meeting Booking API
  if (pathname === '/api/appointments') {
    // GET: Admin views all appointments
    if (method === 'GET') {
      const user = getAuthUser(req);
      if (!user) {
        return sendJSON(res, 401, { error: 'Authentication required to view appointment list' });
      }

      const statusFilter = parsedUrl.query.status;
      let query = 'SELECT * FROM appointments';
      const params = [];

      if (statusFilter && statusFilter !== 'all') {
        query += ' WHERE status = ?';
        params.push(statusFilter);
      }
      query += ' ORDER BY appointment_date ASC, time_slot ASC';

      const appointments = db.prepare(query).all(...params);
      return sendJSON(res, 200, { success: true, appointments });
    }

    // POST: Public Online Meeting Booking Request
    if (method === 'POST') {
      const body = await parseRequestBody(req);
      const {
        fullName,
        email,
        city,
        propertyType,
        meetingType,
        appointmentDate,
        timeSlot,
        billRange,
        requirements
      } = body;

      // 1. Validate Full Name
      const cleanName = sanitizeText(fullName, 100);
      if (!cleanName || cleanName.length < 2) {
        return sendJSON(res, 400, { error: 'Please provide your full name (minimum 2 characters)' });
      }

      // 2. Validate Email (Strictly Required for private meeting link transmission)
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return sendJSON(res, 400, { error: 'A valid email address is required to receive your private meeting link' });
      }

      // 3. Validate Meeting Type
      const cleanMeetingType = (meetingType || '').trim();
      if (!MEETING_TYPES[cleanMeetingType]) {
        return sendJSON(res, 400, { error: 'Please select a valid consultation meeting type' });
      }

      // 4. Validate Date
      if (!appointmentDate || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
        return sendJSON(res, 400, { error: 'Valid appointment date (YYYY-MM-DD) is required' });
      }

      const appointmentDay = new Date(appointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (appointmentDay < today) {
        return sendJSON(res, 400, { error: 'Appointment date cannot be in the past' });
      }

      const maxFutureDate = new Date();
      maxFutureDate.setDate(maxFutureDate.getDate() + 45);
      if (appointmentDay > maxFutureDate) {
        return sendJSON(res, 400, { error: 'Bookings can be scheduled up to 45 days in advance' });
      }

      // 5. Validate Time Slot
      if (!STANDARD_TIME_SLOTS.includes(timeSlot)) {
        return sendJSON(res, 400, { error: 'Please choose an available meeting time slot' });
      }

      // 6. Prevent Double-Booking (Atomic Check)
      const existing = db.prepare(`
        SELECT id FROM appointments
        WHERE appointment_date = ? AND time_slot = ? AND status IN ('pending', 'confirmed')
      `).get(appointmentDate, timeSlot);

      if (existing) {
        return sendJSON(res, 409, {
          error: 'The requested time slot has just been reserved. Please select another slot or date.'
        });
      }

      // 7. Check Blocked Slots
      const isBlocked = db.prepare(`
        SELECT id, reason FROM blocked_slots
        WHERE block_date = ? AND (time_slot IS NULL OR time_slot = '' OR time_slot = ?)
      `).get(appointmentDate, timeSlot);

      if (isBlocked) {
        return sendJSON(res, 409, {
          error: `The selected date/slot is unavailable: ${isBlocked.reason || 'Not open for bookings'}`
        });
      }

      // Generate unpredictable, secure reference number
      const refNo = generateSecureRefNumber('AE-MTG');
      const cleanCity = sanitizeText(city, 80);
      const cleanProperty = ['residential', 'commercial', 'industrial'].includes(propertyType) ? propertyType : 'residential';
      const cleanBill = sanitizeText(billRange, 50);
      const cleanRequirements = sanitizeText(requirements, 500);

      const stmt = db.prepare(`
        INSERT INTO appointments (
          reference_no, full_name, phone, email, city, property_type,
          meeting_type, appointment_date, time_slot, bill_range, requirements, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `);

      stmt.run(
        refNo,
        cleanName,
        '',
        cleanEmail,
        cleanCity,
        cleanProperty,
        cleanMeetingType,
        appointmentDate,
        timeSlot,
        cleanBill,
        cleanRequirements
      );

      // Trigger asynchronous email confirmation (non-blocking)
      sendBookingReceivedEmail({
        reference_no: refNo,
        full_name: cleanName,
        email: cleanEmail,
        meeting_type: MEETING_TYPES[cleanMeetingType],
        appointment_date: appointmentDate,
        time_slot: timeSlot
      }).catch(err => console.error('Email dispatch error:', err));

      return sendJSON(res, 201, {
        success: true,
        referenceNo: refNo,
        message: 'Your online meeting request has been submitted successfully! An acknowledgment has been sent to your email.',
        booking: {
          referenceNo: refNo,
          fullName: cleanName,
          email: cleanEmail,
          appointmentDate,
          timeSlot,
          meetingType: MEETING_TYPES[cleanMeetingType],
          status: 'pending'
        }
      });
    }
  }

  // 8. Secure Customer Booking Status Lookup (Requires Ref ID + Matching Email)
  if (pathname === '/api/appointments/status-lookup' && method === 'POST') {
    // Rate limit lookups per IP (max 20 per 10 minutes)
    const now = Date.now();
    let rl = lookupRateLimits.get(clientIp);
    if (!rl || now > rl.resetTime) {
      rl = { count: 1, resetTime: now + 10 * 60 * 1000 };
    } else {
      rl.count += 1;
    }
    lookupRateLimits.set(clientIp, rl);

    if (rl.count > 20) {
      return sendJSON(res, 429, { error: 'Too many lookup attempts. Please try again in a few minutes.' });
    }

    const body = await parseRequestBody(req);
    const ref = (body.referenceNo || '').trim();
    const email = (body.email || '').trim().toLowerCase();

    if (!ref || !email) {
      return sendJSON(res, 400, { error: 'Both Booking Reference ID and registered email are required' });
    }

    const appointment = db.prepare(`
      SELECT reference_no, full_name, email, meeting_type, appointment_date, time_slot, status, meeting_link, requirements
      FROM appointments
      WHERE UPPER(reference_no) = UPPER(?) AND LOWER(email) = LOWER(?)
    `).get(ref, email);

    if (!appointment) {
      return sendJSON(res, 404, {
        error: 'No matching booking found. Please check your Reference ID and registered email address.'
      });
    }

    // Mask customer name for privacy
    const maskedName = maskCustomerName(appointment.full_name);
    const isConfirmed = appointment.status === 'confirmed';
    const hasMeetingLink = Boolean(appointment.meeting_link && isConfirmed);

    return sendJSON(res, 200, {
      success: true,
      referenceNo: appointment.reference_no,
      maskedName,
      meetingType: MEETING_TYPES[appointment.meeting_type] || appointment.meeting_type,
      appointmentDate: appointment.appointment_date,
      timeSlot: appointment.time_slot,
      status: appointment.status,
      hasMeetingLink,
      // Private message to user; link is delivered securely via email or displayed upon exact verification
      meetingNotice: isConfirmed
        ? 'Your online meeting is confirmed. The Google Meet link has been dispatched to your email.'
        : appointment.status === 'pending'
        ? 'Your request is currently under review by our engineering team.'
        : `Meeting status: ${appointment.status.toUpperCase()}`,
      // Only include direct link if confirmed AND customer has authenticated with exact matching email
      privateMeetingUrl: hasMeetingLink ? appointment.meeting_link : null
    });
  }

  // 9. Admin Update Appointment (Status, Meeting Link, Reschedule, Notes)
  if (pathname.startsWith('/api/appointments/') && method === 'PATCH') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

    const id = parseInt(pathname.split('/')[3], 10);
    const body = await parseRequestBody(req);

    const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    if (!existing) return sendJSON(res, 404, { error: 'Appointment not found' });

    // Handle rescheduling
    const targetDate = body.rescheduleDate || body.appointmentDate;
    const targetSlot = body.rescheduleSlot || body.timeSlot;
    if (targetDate && targetSlot) {

      // Double check availability
      const conflict = db.prepare(`
        SELECT id FROM appointments
        WHERE appointment_date = ? AND time_slot = ? AND status IN ('pending', 'confirmed') AND id != ?
      `).get(targetDate, targetSlot, id);

      if (conflict) {
        return sendJSON(res, 409, { error: 'Target slot is already booked for that date' });
      }

      db.prepare(`
        UPDATE appointments
        SET appointment_date = ?, time_slot = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(targetDate, targetSlot, id);
    }

    // Handle status update
    if (body.status && VALID_STATUSES.includes(body.status)) {
      db.prepare('UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(body.status, id);
    }

    // Handle meeting link update
    if (body.meetingLink !== undefined) {
      const cleanLink = sanitizeText(body.meetingLink, 300);
      db.prepare(`
        UPDATE appointments
        SET meeting_link = ?, meeting_link_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(cleanLink || null, id);

      // If appointment is confirmed and link is supplied, send confirmation email
      if (cleanLink && (body.status === 'confirmed' || existing.status === 'confirmed')) {
        sendMeetingApprovedEmail(
          { ...existing, meeting_type: MEETING_TYPES[existing.meeting_type] || existing.meeting_type },
          cleanLink
        ).catch(err => console.error('Email send error:', err));
      }
    }

    // Handle internal admin notes
    if (body.adminNotes !== undefined) {
      db.prepare('UPDATE appointments SET admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        sanitizeText(body.adminNotes, 1000),
        id
      );
    }

    return sendJSON(res, 200, { success: true, message: 'Appointment updated successfully' });
  }

  // 10. Admin Helper: Auto-Generate Google Meet Room Link
  if (pathname.startsWith('/api/appointments/') && pathname.endsWith('/generate-meet') && method === 'POST') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

    const id = parseInt(pathname.split('/')[3], 10);
    const existing = db.prepare('SELECT id, email, full_name, meeting_type, appointment_date, time_slot FROM appointments WHERE id = ?').get(id);
    if (!existing) return sendJSON(res, 404, { error: 'Appointment not found' });

    const meetUrl = generateGoogleMeetUrl();
    db.prepare(`
      UPDATE appointments
      SET meeting_link = ?, meeting_link_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(meetUrl, id);

    return sendJSON(res, 200, {
      success: true,
      meetingLink: meetUrl,
      message: 'Google Meet link generated and assigned.'
    });
  }

  // 11. Block dates / slots (Admin)
  if (pathname === '/api/blocked-slots') {
    if (method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });
      const slots = db.prepare('SELECT * FROM blocked_slots ORDER BY block_date DESC').all();
      return sendJSON(res, 200, { success: true, slots });
    }
    if (method === 'POST') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      const body = await parseRequestBody(req);
      const { blockDate, timeSlot, reason } = body;
      if (!blockDate) return sendJSON(res, 400, { error: 'Block date is required' });

      db.prepare(`
        INSERT INTO blocked_slots (block_date, time_slot, reason)
        VALUES (?, ?, ?)
      `).run(blockDate, timeSlot || null, sanitizeText(reason, 200) || 'Blocked by Admin');

      return sendJSON(res, 201, { success: true, message: 'Date/Slot blocked successfully' });
    }
  }

  if (pathname.startsWith('/api/blocked-slots/') && method === 'DELETE') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });
    const id = parseInt(pathname.split('/')[3], 10);
    db.prepare('DELETE FROM blocked_slots WHERE id = ?').run(id);
    return sendJSON(res, 200, { success: true, message: 'Unblocked successfully' });
  }

  // 12. Confidential Customer Leads & General Enquiries
  if (pathname === '/api/enquiries') {
    // GET: Admin leads list
    if (method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      const typeFilter = parsedUrl.query.type;
      const statusFilter = parsedUrl.query.status;
      const search = parsedUrl.query.search;

      let query = 'SELECT * FROM enquiries WHERE 1=1';
      const params = [];

      if (typeFilter && typeFilter !== 'all') {
        query += ' AND type = ?';
        params.push(typeFilter);
      }
      if (statusFilter && statusFilter !== 'all') {
        query += ' AND status = ?';
        params.push(statusFilter);
      }
      if (search && search.trim()) {
        query += ' AND (name LIKE ? OR email LIKE ? OR city LIKE ? OR reference_no LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term, term, term);
      }

      query += ' ORDER BY created_at DESC';
      const enquiries = db.prepare(query).all(...params);

      return sendJSON(res, 200, { success: true, enquiries });
    }

    // POST: Public General Message / Subsidy Enquiry
    if (method === 'POST') {
      const body = await parseRequestBody(req);
      const {
        type,
        name,
        email,
        city,
        state,
        propertyType,
        monthlyBill,
        solarCapacityKw,
        brandInterest,
        serviceInterest,
        message
      } = body;

      const cleanName = sanitizeText(name, 100);
      if (!cleanName || cleanName.length < 2) {
        return sendJSON(res, 400, { error: 'Please enter your name' });
      }

      const cleanEmail = (email || '').trim().toLowerCase();
      if (cleanEmail && !isValidEmail(cleanEmail)) {
        return sendJSON(res, 400, { error: 'Please enter a valid email address' });
      }

      const refNo = generateSecureRefNumber('AE-ENQ');

      const stmt = db.prepare(`
        INSERT INTO enquiries (
          reference_no, type, name, email, city, state,
          property_type, monthly_bill, solar_capacity_kw, brand_interest,
          service_interest, message, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
      `);

      stmt.run(
        refNo,
        sanitizeText(type, 50) || 'general_enquiry',
        cleanName,
        cleanEmail || null,
        sanitizeText(city, 80) || 'Madhya Pradesh',
        sanitizeText(state, 50) || 'Madhya Pradesh',
        sanitizeText(propertyType, 30) || 'residential',
        monthlyBill ? parseFloat(monthlyBill) : null,
        solarCapacityKw ? parseFloat(solarCapacityKw) : null,
        sanitizeText(brandInterest, 80) || null,
        sanitizeText(serviceInterest, 100) || null,
        sanitizeText(message, 1000) || ''
      );

      return sendJSON(res, 201, {
        success: true,
        referenceNo: refNo,
        message: 'Thank you! Your enquiry has been received securely. Our team will contact you via your registered email.'
      });
    }
  }

  // Update lead status or internal notes (Admin)
  if (pathname.startsWith('/api/enquiries/') && method === 'PATCH') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

    const id = parseInt(pathname.split('/')[3], 10);
    const body = await parseRequestBody(req);

    if (body.status) {
      db.prepare('UPDATE enquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(body.status, id);
    }
    if (body.notes !== undefined) {
      db.prepare('UPDATE enquiries SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        sanitizeText(body.notes, 1000),
        id
      );
    }

    return sendJSON(res, 200, { success: true, message: 'Enquiry updated' });
  }

  // Export leads to CSV (Admin)
  if (pathname === '/api/enquiries/export' && method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

    const enquiries = db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC').all();

    let csv = 'Reference No,Date,Type,Name,Email,City,Property Type,Monthly Bill (INR),Capacity (kW),Brand Interest,Service,Status,Notes\r\n';

    for (const e of enquiries) {
      const escape = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
      csv += [
        escape(e.reference_no),
        escape(e.created_at),
        escape(e.type),
        escape(e.name),
        escape(e.email),
        escape(e.city),
        escape(e.property_type),
        e.monthly_bill || '',
        e.solar_capacity_kw || '',
        escape(e.brand_interest),
        escape(e.service_interest),
        escape(e.status),
        escape(e.notes)
      ].join(',') + '\r\n';
    }

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=UTF-8',
      'Content-Disposition': 'attachment; filename="atharva_solar_enquiries.csv"'
    });
    return res.end(csv);
  }

  // 13. Admin Authentication with Rate Limiting & Audit Logging
  if (pathname === '/api/admin/login' && method === 'POST') {
    const body = await parseRequestBody(req);
    const result = authenticate(body.email, body.password, clientIp);

    // Record login attempt audit
    try {
      db.prepare(`
        INSERT INTO login_attempts (ip_address, email, success)
        VALUES (?, ?, ?)
      `).run(clientIp, sanitizeText(body.email, 100) || '', result.success ? 1 : 0);
    } catch {}

    if (result.locked) {
      return sendJSON(res, 429, { error: result.error, locked: true });
    }

    if (!result.success) {
      return sendJSON(res, 401, { error: result.error });
    }

    return sendJSON(res, 200, {
      success: true,
      token: result.token,
      user: {
        email: result.user.email,
        name: result.user.name,
        role: result.user.role
      }
    });
  }

  if (pathname === '/api/admin/logout' && method === 'POST') {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      revokeSession(token);
    }
    return sendJSON(res, 200, { success: true, message: 'Logged out successfully' });
  }

  if (pathname === '/api/admin/me' && method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { authenticated: false });
    return sendJSON(res, 200, { authenticated: true, user });
  }

  // Admin Dashboard Key Statistics
  if (pathname === '/api/admin/stats' && method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

    const totalEnquiries = db.prepare('SELECT COUNT(*) as c FROM enquiries').get().c;
    const newEnquiries = db.prepare("SELECT COUNT(*) as c FROM enquiries WHERE status = 'new'").get().c;
    const totalAppointments = db.prepare('SELECT COUNT(*) as c FROM appointments').get().c;
    const confirmedAppointments = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'confirmed'").get().c;
    const pendingAppointments = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'pending'").get().c;
    const completedMeetings = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'completed'").get().c;

    return sendJSON(res, 200, {
      success: true,
      stats: {
        totalEnquiries,
        newEnquiries,
        totalAppointments,
        confirmedAppointments,
        pendingAppointments,
        completedMeetings
      }
    });
  }

  // 14. Visitor Traffic Analytics (Admin Only)
  if (pathname === '/api/admin/analytics' && method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });
    const analytics = getVisitorAnalytics();
    return sendJSON(res, 200, { success: true, analytics });
  }

  // 15. Change Admin Password (Admin Only)
  if (pathname === '/api/admin/change-password' && method === 'POST') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });
    const body = await parseRequestBody(req);
    if (!body.oldPassword || !body.newPassword) {
      return sendJSON(res, 400, { error: 'Both current password and new password are required' });
    }
    if (body.newPassword.length < 8) {
      return sendJSON(res, 400, { error: 'New password must be at least 8 characters' });
    }
    const success = changePassword(user.userId, body.oldPassword, body.newPassword);
    if (!success) {
      return sendJSON(res, 400, { error: 'Incorrect current password' });
    }
    return sendJSON(res, 200, { success: true, message: 'Password updated successfully with PBKDF2 encryption' });
  }

  // 16. Anonymous Visitor Tracking Ping
  if (pathname === '/api/analytics/track' && method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const ua = req.headers['user-agent'] || '';
      let deviceType = 'Desktop';
      if (/mobile|android|iphone/i.test(ua)) {
        deviceType = 'Mobile';
      } else if (/tablet|ipad/i.test(ua)) {
        deviceType = 'Tablet';
      }

      recordVisit({
        visitorId: sanitizeText(body.visitorId, 64) || 'v_' + Math.random().toString(36).substring(2, 9),
        ipAddress: clientIp,
        userAgent: sanitizeText(ua, 250),
        deviceType,
        pagePath: sanitizeText(body.pagePath, 150) || '/',
        referrer: sanitizeText(body.referrer, 150) || 'Direct'
      });
      return sendJSON(res, 200, { success: true });
    } catch {
      return sendJSON(res, 200, { success: false });
    }
  }

  // -------------------------------------------------------------
  // STATIC FILE SERVING WITH SECURITY CONTROLS
  // -------------------------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const normalizedPath = path.normalize(filePath);

  // Security check: ensure path stays within PUBLIC_DIR
  if (!normalizedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(normalizedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback to index.html
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('404 Not Found');
        }
        addSecurityHeaders(res);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(normalizedPath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('500 Server Error');
      }
      addSecurityHeaders(res);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`Atharva Enterprises Solar Web Application`);
    console.log(`A Class Electrical & PWD Contractor`);
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

module.exports = server;


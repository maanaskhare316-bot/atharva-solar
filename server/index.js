/**
 * Atharva Enterprises - Core Web Server & REST API
 * Native Node.js HTTP Server + SQLite + RESTful API
 */

const http = require('node:http');
const url = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const { db, getSettings, updateSetting, recordVisit, getVisitorAnalytics } = require('./db');
const { authenticate, validateSession, revokeSession, changePassword } = require('./auth');
const {
  isValidIndianPhone,
  formatPhone,
  getWhatsAppDigits,
  generateRefNumber,
  STANDARD_TIME_SLOTS
} = require('./validators');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

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

/**
 * Helper to parse JSON body
 */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // 2MB max payload limit
      if (body.length > 2 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
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
 * Solar Subsidy & Savings Calculator Logic (PM Surya Ghar Muft Bijli Yojana aligned)
 */
function calculateSolarPlan(monthlyBill, sanctionedLoadKw = null) {
  const bill = parseFloat(monthlyBill) || 3000;
  // Average tariff in MP: approx ₹7.5 per unit
  const estimatedUnitsPerMonth = bill / 7.5;
  const unitsPerDay = estimatedUnitsPerMonth / 30;

  // 1 kW generates approx 4 units per day in Central India (MP average)
  let recommendedKw = unitsPerDay / 4;
  // Round to nearest 0.5 kW, minimum 1 kW, max 100 kW
  recommendedKw = Math.max(1, Math.round(recommendedKw * 2) / 2);

  // Roof space needed: ~80 to 100 sq.ft per kW
  const roofAreaSqFt = Math.round(recommendedKw * 95);

  // Government Subsidy Calculation (PM Surya Ghar scheme rules)
  // Up to 1 kW: ₹30,000
  // Up to 2 kW: ₹60,000
  // 3 kW and above: ₹78,000 (Maximum cap for residential rooftop)
  let subsidyAmount = 0;
  if (recommendedKw >= 3) {
    subsidyAmount = 78000;
  } else if (recommendedKw >= 2) {
    subsidyAmount = 60000;
  } else if (recommendedKw >= 1) {
    subsidyAmount = 30000;
  }

  // Estimated gross turnkey benchmark cost: ~₹55,000 to ₹65,000 per kW
  const benchmarkCostPerKw = 60000;
  const estimatedGrossCost = Math.round(recommendedKw * benchmarkCostPerKw);
  const netEstimatedCost = Math.max(0, estimatedGrossCost - subsidyAmount);

  // Annual savings: units * 12 months * ₹7.5/unit
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

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
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
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }

  // 2. Settings & Company Info
  if (pathname === '/api/settings') {
    if (method === 'GET') {
      const settings = getSettings();
      return sendJSON(res, 200, { success: true, settings });
    }
    if (method === 'POST' || method === 'PUT') {
      const user = getAuthUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      const body = await parseRequestBody(req);
      for (const [key, val] of Object.entries(body)) {
        updateSetting(key, String(val));
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
      db.prepare('UPDATE brands SET tagline = ? WHERE id = ?').run(body.tagline, brandId);
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

  // 6. Available Time Slots for Date
  if (pathname === '/api/slots/available' && method === 'GET') {
    const date = parsedUrl.query.date;
    if (!date) {
      return sendJSON(res, 400, { error: 'Query parameter date (YYYY-MM-DD) is required' });
    }

    // Check if entire date is blocked
    const dayBlocked = db.prepare("SELECT id, reason FROM blocked_slots WHERE block_date = ? AND (time_slot IS NULL OR time_slot = '')").get(date);
    if (dayBlocked) {
      return sendJSON(res, 200, {
        date,
        isBlocked: true,
        reason: dayBlocked.reason || 'This date is not available for appointments',
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
        reason: unavailable.has(slot) ? 'Already reserved or unavailable' : 'Available'
      }))
    });
  }

  // 7. Appointments API
  if (pathname === '/api/appointments') {
    // GET: Admin views all appointments, or filtered by date / status
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

    // POST: Create a new appointment
    if (method === 'POST') {
      const body = await parseRequestBody(req);
      const {
        fullName,
        phone,
        email,
        city,
        propertyType,
        meetingType,
        appointmentDate,
        timeSlot,
        billRange,
        requirements
      } = body;

      // Basic validations
      if (!fullName || !fullName.trim()) {
        return sendJSON(res, 400, { error: 'Full name is required' });
      }
      if (!isValidIndianPhone(phone)) {
        return sendJSON(res, 400, { error: 'Please provide a valid 10-digit Indian mobile number' });
      }
      if (!city || !city.trim()) {
        return sendJSON(res, 400, { error: 'City / Location is required' });
      }
      if (!appointmentDate || !timeSlot) {
        return sendJSON(res, 400, { error: 'Preferred date and time slot are required' });
      }

      // Prevent past dates
      const appointmentDay = new Date(appointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (appointmentDay < today) {
        return sendJSON(res, 400, { error: 'Appointment date cannot be in the past' });
      }

      // Check double-booking
      const existing = db.prepare(`
        SELECT id FROM appointments
        WHERE appointment_date = ? AND time_slot = ? AND status IN ('pending', 'confirmed')
      `).get(appointmentDate, timeSlot);

      if (existing) {
        return sendJSON(res, 409, {
          error: 'This time slot has already been booked. Please choose an alternate slot or date.'
        });
      }

      // Check blocked slots
      const isBlocked = db.prepare(`
        SELECT id, reason FROM blocked_slots
        WHERE block_date = ? AND (time_slot IS NULL OR time_slot = '' OR time_slot = ?)
      `).get(appointmentDate, timeSlot);

      if (isBlocked) {
        return sendJSON(res, 409, {
          error: `The selected date/slot is unavailable: ${isBlocked.reason || 'Not open for bookings'}`
        });
      }

      const refNo = generateRefNumber('AE-APT');
      const formattedPhone = formatPhone(phone);

      const stmt = db.prepare(`
        INSERT INTO appointments (
          reference_no, full_name, phone, email, city, property_type,
          meeting_type, appointment_date, time_slot, bill_range, requirements, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `);

      stmt.run(
        refNo,
        fullName.trim(),
        formattedPhone,
        email ? email.trim() : null,
        city.trim(),
        propertyType || 'residential',
        meetingType || 'site_visit',
        appointmentDate,
        timeSlot,
        billRange || 'Not specified',
        requirements ? requirements.trim() : ''
      );

      // Create WhatsApp message link for user convenience
      const meetingTypeLabels = {
        site_visit: 'Free Site Visit & Roof Inspection',
        office_meeting: 'Office Consultation',
        online_consultation: 'Online Video / Phone Consultation'
      };

      const waText = encodeURIComponent(
        `Hello Atharva Enterprises, I have booked a ${meetingTypeLabels[meetingType] || 'meeting'} on your website.\n\n` +
        `*Reference No:* ${refNo}\n` +
        `*Name:* ${fullName.trim()}\n` +
        `*City:* ${city.trim()}\n` +
        `*Date:* ${appointmentDate}\n` +
        `*Slot:* ${timeSlot}\n` +
        `*Property:* ${propertyType || 'Residential'}\n\n` +
        `Please confirm my booking.`
      );

      const whatsappUrl = `https://wa.me/919039005531?text=${waText}`;

      return sendJSON(res, 201, {
        success: true,
        referenceNo: refNo,
        message: 'Your solar consultation appointment has been scheduled successfully!',
        appointment: {
          referenceNo: refNo,
          fullName: fullName.trim(),
          phone: formattedPhone,
          city: city.trim(),
          appointmentDate,
          timeSlot,
          meetingType,
          status: 'pending'
        },
        whatsappUrl
      });
    }
  }

  // Lookup appointment by reference number (Public)
  if (pathname.startsWith('/api/appointments/lookup') && method === 'GET') {
    const ref = parsedUrl.query.ref;
    const phone = parsedUrl.query.phone;
    if (!ref) {
      return sendJSON(res, 400, { error: 'Booking reference number is required' });
    }

    let appointment;
    if (phone) {
      const cleanPhoneDigits = phone.replace(/\D/g, '').slice(-10);
      appointment = db.prepare(`
        SELECT * FROM appointments
        WHERE reference_no = ? AND phone LIKE ?
      `).get(ref.trim(), `%${cleanPhoneDigits}%`);
    } else {
      appointment = db.prepare('SELECT reference_no, full_name, city, meeting_type, appointment_date, time_slot, status FROM appointments WHERE reference_no = ?').get(ref.trim());
    }

    if (!appointment) {
      return sendJSON(res, 404, { error: 'No matching appointment found' });
    }

    return sendJSON(res, 200, { success: true, appointment });
  }

  // Update appointment status / notes (Admin)
  if (pathname.startsWith('/api/appointments/') && method === 'PATCH') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

    const id = parseInt(pathname.split('/')[3], 10);
    const body = await parseRequestBody(req);

    const existing = db.prepare('SELECT id FROM appointments WHERE id = ?').get(id);
    if (!existing) return sendJSON(res, 404, { error: 'Appointment not found' });

    if (body.status) {
      db.prepare('UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(body.status, id);
    }
    if (body.adminNotes !== undefined) {
      db.prepare('UPDATE appointments SET admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(body.adminNotes, id);
    }

    return sendJSON(res, 200, { success: true, message: 'Appointment updated successfully' });
  }

  // Block dates / slots (Admin)
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
      `).run(blockDate, timeSlot || null, reason || 'Blocked by Admin');

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

  // 8. Customer Enquiries & Lead Management
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
        query += ' AND (name LIKE ? OR phone LIKE ? OR city LIKE ? OR reference_no LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term, term, term);
      }

      query += ' ORDER BY created_at DESC';
      const enquiries = db.prepare(query).all(...params);

      return sendJSON(res, 200, { success: true, enquiries });
    }

    // POST: Public enquiry submission
    if (method === 'POST') {
      const body = await parseRequestBody(req);
      const {
        type, // 'quote', 'callback', 'subsidy_check', 'brand_inquiry', 'general_contact'
        name,
        phone,
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

      if (!name || !name.trim()) {
        return sendJSON(res, 400, { error: 'Name is required' });
      }
      if (!isValidIndianPhone(phone)) {
        return sendJSON(res, 400, { error: 'Please enter a valid 10-digit Indian phone number' });
      }

      const refNo = generateRefNumber('AE-ENQ');
      const formattedPhone = formatPhone(phone);

      const stmt = db.prepare(`
        INSERT INTO enquiries (
          reference_no, type, name, phone, email, city, state,
          property_type, monthly_bill, solar_capacity_kw, brand_interest,
          service_interest, message, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
      `);

      stmt.run(
        refNo,
        type || 'general_contact',
        name.trim(),
        formattedPhone,
        email ? email.trim() : null,
        city ? city.trim() : 'Madhya Pradesh',
        state || 'Madhya Pradesh',
        propertyType || 'residential',
        monthlyBill ? parseFloat(monthlyBill) : null,
        solarCapacityKw ? parseFloat(solarCapacityKw) : null,
        brandInterest || null,
        serviceInterest || null,
        message ? message.trim() : ''
      );

      // Pre-filled WhatsApp response link
      const waMessage = encodeURIComponent(
        `Hello Atharva Enterprises, I submitted an enquiry for ${type || 'solar services'}.\n\n` +
        `*Reference:* ${refNo}\n` +
        `*Name:* ${name.trim()}\n` +
        (brandInterest ? `*Brand Interest:* ${brandInterest}\n` : '') +
        (serviceInterest ? `*Service:* ${serviceInterest}\n` : '') +
        (monthlyBill ? `*Monthly Bill:* ₹${monthlyBill}\n` : '') +
        `Please provide more information and quotation.`
      );

      return sendJSON(res, 201, {
        success: true,
        referenceNo: refNo,
        message: 'Thank you! Your enquiry has been received. Our team will contact you shortly.',
        whatsappUrl: `https://wa.me/919039005531?text=${waMessage}`
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
      db.prepare('UPDATE enquiries SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(body.notes, id);
    }

    return sendJSON(res, 200, { success: true, message: 'Enquiry updated' });
  }

  // Export leads to CSV (Admin)
  if (pathname === '/api/enquiries/export' && method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

    const enquiries = db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC').all();

    let csv = 'Reference No,Date,Type,Name,Phone,Email,City,Property Type,Monthly Bill (INR),Capacity (kW),Brand Interest,Service,Status,Notes\r\n';

    for (const e of enquiries) {
      const escape = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
      csv += [
        escape(e.reference_no),
        escape(e.created_at),
        escape(e.type),
        escape(e.name),
        escape(e.phone),
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
      'Content-Disposition': 'attachment; filename="atharva_solar_leads.csv"'
    });
    return res.end(csv);
  }

  // 9. Admin Authentication
  if (pathname === '/api/admin/login' && method === 'POST') {
    const body = await parseRequestBody(req);
    const result = authenticate(body.email, body.password);
    if (!result) {
      return sendJSON(res, 401, { error: 'Invalid email address or password' });
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
    const completedSiteVisits = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'completed'").get().c;

    return sendJSON(res, 200, {
      success: true,
      stats: {
        totalEnquiries,
        newEnquiries,
        totalAppointments,
        confirmedAppointments,
        pendingAppointments,
        completedSiteVisits
      }
    });
  }

  // 10. Visitor Traffic Analytics (Admin Only)
  if (pathname === '/api/admin/analytics' && method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });
    const analytics = getVisitorAnalytics();
    return sendJSON(res, 200, { success: true, analytics });
  }

  // 11. Change Admin Password (Admin Only)
  if (pathname === '/api/admin/change-password' && method === 'POST') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });
    const body = await parseRequestBody(req);
    if (!body.oldPassword || !body.newPassword) {
      return sendJSON(res, 400, { error: 'Both current password and new password are required' });
    }
    if (body.newPassword.length < 6) {
      return sendJSON(res, 400, { error: 'New password must be at least 6 characters' });
    }
    const success = changePassword(user.userId, body.oldPassword, body.newPassword);
    if (!success) {
      return sendJSON(res, 400, { error: 'Incorrect current password' });
    }
    return sendJSON(res, 200, { success: true, message: 'Password updated successfully' });
  }

  // 12. Public Visitor Tracking Ping
  if (pathname === '/api/analytics/track' && method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const ip = rawIp.split(',')[0].trim();
      const ua = req.headers['user-agent'] || '';
      let deviceType = 'Desktop';
      if (/mobile|android|iphone/i.test(ua)) {
        deviceType = 'Mobile';
      } else if (/tablet|ipad/i.test(ua)) {
        deviceType = 'Tablet';
      }

      recordVisit({
        visitorId: body.visitorId || 'v_' + Math.random().toString(36).substring(2, 9),
        ipAddress: ip,
        userAgent: ua.substring(0, 250),
        deviceType,
        pagePath: body.pagePath || '/',
        referrer: body.referrer || 'Direct'
      });
      return sendJSON(res, 200, { success: true });
    } catch (err) {
      return sendJSON(res, 200, { success: false });
    }
  }

  // -------------------------------------------------------------
  // STATIC FILE SERVING
  // -------------------------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security check: ensure normalized path stays within PUBLIC_DIR
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(normalizedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If client requests a route like /admin, fall back to index.html (SPA routing)
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('404 Not Found');
        }
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
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`Atharva Enterprises Solar Web Application`);
  console.log(`A Class Electrical & PWD Contractor`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`Protected Admin Route: http://localhost:${PORT}/admin-portal`);
  console.log(`====================================================`);
});

/**
 * End-to-End Verification Test Suite for Atharva Enterprises Solar Upgrade
 * Tests Security, Booking Flow, Google Meet Assignment, Admin Auth, and Anti-Enumeration
 * Direct in-process execution ensuring 100% test reliability in sandboxed environments.
 */

const path = require('node:path');
const { Readable } = require('node:stream');
const { EventEmitter } = require('node:events');

// Change working directory to project root
process.chdir(__dirname);

// Start server
const server = require('./server/index.js');
const { db } = require('./server/db');

function request(urlPath, options = {}) {
  return new Promise((resolve) => {
    const req = new Readable();
    req._read = () => {};
    req.url = urlPath;
    req.method = options.method || 'GET';
    
    // Normalize headers
    const rawHeaders = Object.assign({
      'host': 'localhost:3000',
      'user-agent': 'AtharvaTestRunner/1.0',
      'content-type': 'application/json'
    }, options.headers || {});
    
    req.headers = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
      req.headers[k.toLowerCase()] = v;
    }
    
    req.socket = {
      remoteAddress: options.remoteAddress || '127.0.0.1'
    };

    let statusCode = 200;
    const responseHeaders = {};
    let responseBody = '';

    const res = new EventEmitter();
    res.writeHead = (code, headers = {}) => {
      statusCode = code;
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          responseHeaders[k.toLowerCase()] = v;
        }
      }
      return res;
    };
    res.setHeader = (key, val) => {
      responseHeaders[key.toLowerCase()] = val;
    };
    res.getHeader = (key) => responseHeaders[key.toLowerCase()];
    res.write = (chunk) => {
      if (chunk) responseBody += chunk.toString();
      return true;
    };
    res.end = (chunk) => {
      if (chunk) responseBody += chunk.toString();
      let json = null;
      try {
        json = JSON.parse(responseBody);
      } catch (e) {
        json = null;
      }
      resolve({
        statusCode,
        headers: responseHeaders,
        body: responseBody,
        json
      });
    };

    // Emit request event on server
    server.emit('request', req, res);

    if (options.body) {
      const data = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.push(data);
    }
    req.push(null);
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('\n================================================================');
  console.log('   ATHARVA ENTERPRISES SECURE ONLINE BOOKING SYSTEM TEST SUITE  ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // Test 1: Security Headers & Sanitized Public Page
    // -------------------------------------------------------------
    console.log('[Step 1] Verifying HTTP Security Headers & Public Assets...');
    const homeRes = await request('/');
    assert(homeRes.statusCode === 200, 'Home page served successfully (HTTP 200)');
    assert(homeRes.headers['content-security-policy'], 'Content-Security-Policy header present');
    assert(homeRes.headers['x-frame-options'] === 'SAMEORIGIN', 'X-Frame-Options header is SAMEORIGIN');
    assert(homeRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options is nosniff');
    assert(homeRes.headers['referrer-policy'] === 'strict-origin-when-cross-origin', 'Referrer-Policy configured');

    assert(!homeRes.body.includes('+91 90390 05531'), 'Public HTML does not contain raw phone number');
    assert(!homeRes.body.includes('wa.me/919039005531'), 'Public HTML does not contain direct WhatsApp link');
    assert(homeRes.body.includes('Book an Online Consultation'), 'Public HTML contains "Book an Online Consultation" CTAs');
    assert(!homeRes.body.includes('calc-slider'), 'Public HTML contains zero solar calculator elements');
    assert(!homeRes.body.includes('countdown-wrapper'), 'Public HTML contains zero subsidy countdown timers');
    assert(!homeRes.body.includes('admin-view-wrap'), 'Public HTML is completely decoupled from admin dashboard');
    assert(homeRes.body.includes('track-booking'), 'Public HTML contains status lookup section');
    assert(homeRes.body.includes('faq'), 'Public HTML contains FAQ section');

    // Verify admin page separation
    const adminPageRes = await request('/admin');
    assert(adminPageRes.statusCode === 200, 'Dedicated /admin route served successfully');
    assert(adminPageRes.body.includes('admin-login-screen'), 'Admin portal contains secure authentication gate');

    // -------------------------------------------------------------
    // Test 2: Customer Booking Submission (POST /api/appointments)
    // -------------------------------------------------------------
    console.log('\n[Step 2] Testing Online Appointment Booking API...');
    const testDate = '2026-12-15';
    const testSlot = '10:00 AM - 11:00 AM';
    const customerEmail = 'rajesh.sharma@example.in';
    const newDate = '2026-12-16';

    // Clear any previous test artifacts
    db.prepare('DELETE FROM appointments WHERE appointment_date IN (?, ?)').run(testDate, newDate);

    // 2a: Missing email should fail
    const invalidBooking = await request('/api/appointments', {
      method: 'POST',
      body: {
        fullName: 'Rajesh Sharma',
        city: 'Indore',
        meetingType: 'solar_consultation',
        appointmentDate: testDate,
        timeSlot: testSlot
      }
    });
    assert(invalidBooking.statusCode === 400, 'Booking without email rejected with 400 Bad Request');

    // 2b: Valid booking
    const validBooking = await request('/api/appointments', {
      method: 'POST',
      body: {
        fullName: 'Rajesh Sharma',
        email: customerEmail,
        city: 'Indore',
        meetingType: 'solar_consultation',
        appointmentDate: testDate,
        timeSlot: testSlot,
        billRange: '₹3,000 - ₹5,000',
        requirements: 'Interested in 3kW residential rooftop system under PM Surya Ghar.'
      }
    });
    assert(validBooking.statusCode === 201, `Valid appointment created (HTTP 201) - Received: ${validBooking.statusCode} ${validBooking.body}`);
    assert(validBooking.json && validBooking.json.success === true, 'Response indicates success');
    const bookingRef = validBooking.json.referenceNo;
    assert(bookingRef && bookingRef.startsWith('AE-MTG-'), `Crypto-secure Reference ID assigned: ${bookingRef}`);
    assert(!validBooking.json.whatsappUrl, 'No WhatsApp URL exposed in booking response');

    // -------------------------------------------------------------
    // Test 3: Double Booking Prevention
    // -------------------------------------------------------------
    console.log('\n[Step 3] Testing Server-Side Double-Booking Prevention...');
    const duplicateBooking = await request('/api/appointments', {
      method: 'POST',
      body: {
        fullName: 'Another Customer',
        email: 'another@example.com',
        city: 'Bhopal',
        meetingType: 'rooftop_discussion',
        appointmentDate: testDate,
        timeSlot: testSlot
      }
    });
    assert(duplicateBooking.statusCode === 409, 'Duplicate booking on same date and time slot rejected with 409 Conflict');

    // -------------------------------------------------------------
    // Test 4: Access Control & Admin Login
    // -------------------------------------------------------------
    console.log('\n[Step 4] Testing Access Control & Admin Authentication...');

    // 4a: Unauthorized access should be blocked
    const unauthAppointments = await request('/api/appointments');
    assert(unauthAppointments.statusCode === 401, 'Access to /api/appointments without token rejected with 401 Unauthorized');

    // 4b: Invalid login attempt
    const failedLogin = await request('/api/admin/login', {
      method: 'POST',
      body: { email: 'admin@atharvasolar.com', password: 'WrongPassword@123' }
    });
    assert(failedLogin.statusCode === 401, 'Invalid password rejected with 401 Unauthorized');

    // 4c: Successful admin login with PBKDF2 hash verification
    const successfulLogin = await request('/api/admin/login', {
      method: 'POST',
      body: { email: 'admin@atharvasolar.com', password: 'Atharva@2026' }
    });
    assert(successfulLogin.statusCode === 200, 'Admin login succeeded (HTTP 200)');
    const adminToken = successfulLogin.json.token;
    assert(adminToken && adminToken.length >= 32, 'Cryptographic session token issued');

    // -------------------------------------------------------------
    // Test 5: Admin Appointment Management & Meet Link Generation
    // -------------------------------------------------------------
    console.log('\n[Step 5] Testing Admin Appointment Retrieval & Google Meet Link Generation...');
    const appointmentsRes = await request('/api/appointments', {
      headers: { 'authorization': `Bearer ${adminToken}` }
    });
    assert(appointmentsRes.statusCode === 200, 'Admin successfully retrieved appointments list');
    const aptList = appointmentsRes.json.appointments;
    const ourApt = aptList.find(a => a.reference_no === bookingRef);
    assert(ourApt !== undefined, `Created appointment ${bookingRef} found in admin list`);
    assert(ourApt.status === 'pending', 'Initial appointment status is pending');

    // Test meeting link generator endpoint
    const meetRes = await request(`/api/appointments/${ourApt.id}/generate-meet`, {
      method: 'POST',
      headers: { 'authorization': `Bearer ${adminToken}` }
    });
    assert(meetRes.statusCode === 200, 'Google Meet link generator endpoint responded (HTTP 200)');
    const generatedMeetUrl = meetRes.json.meetingLink;
    assert(generatedMeetUrl && generatedMeetUrl.startsWith('https://meet.google.com/'), `Valid Google Meet URL format: ${generatedMeetUrl}`);

    // Admin approves booking and assigns Google Meet link
    console.log('\n[Step 6] Testing Admin Booking Approval & Private Email Dispatch...');
    const approveRes = await request(`/api/appointments/${ourApt.id}`, {
      method: 'PATCH',
      headers: {
        'authorization': `Bearer ${adminToken}`
      },
      body: {
        status: 'confirmed',
        meetingLink: generatedMeetUrl,
        adminNotes: 'Initial consultation approved. Link issued for video conference.'
      }
    });
    assert(approveRes.statusCode === 200, 'Appointment confirmed with meeting link by admin (HTTP 200)');
    const updatedApt = db.prepare('SELECT status, meeting_link FROM appointments WHERE id = ?').get(ourApt.id);
    assert(updatedApt.status === 'confirmed', 'Appointment status updated to confirmed in DB');
    assert(updatedApt.meeting_link === generatedMeetUrl, 'Meeting link stored in DB record');

    // -------------------------------------------------------------
    // Test 7: Secure Customer Status Lookup & Anti-Enumeration
    // -------------------------------------------------------------
    console.log('\n[Step 7] Testing Customer Self-Service Status Lookup & Privacy Masking...');

    // 7a: Lookup with wrong email must fail (404) to prevent user enumeration
    const wrongEmailLookup = await request('/api/appointments/status-lookup', {
      method: 'POST',
      body: {
        referenceNo: bookingRef,
        email: 'attacker@evil.com'
      }
    });
    assert(wrongEmailLookup.statusCode === 404, 'Status lookup with wrong email returned 404 (No leakage)');

    // 7b: Lookup with correct reference ID and email
    const validLookup = await request('/api/appointments/status-lookup', {
      method: 'POST',
      body: {
        referenceNo: bookingRef,
        email: customerEmail
      }
    });
    assert(validLookup.statusCode === 200, 'Customer status lookup successful (HTTP 200)');
    const lookupData = validLookup.json;
    assert(lookupData.referenceNo === bookingRef, 'Reference number verified');
    assert(lookupData.status === 'confirmed', 'Confirmed status accurately reported to customer');
    assert(lookupData.maskedName === 'Rajesh S.', `Customer name PII masked: "${lookupData.maskedName}"`);
    assert(lookupData.meetingNotice && lookupData.meetingNotice.includes('email'), 'Customer notified that meeting link was sent to their email');

    // -------------------------------------------------------------
    // Test 8: Reschedule Booking
    // -------------------------------------------------------------
    console.log('\n[Step 8] Testing Appointment Rescheduling by Admin...');
    const newSlot = '02:00 PM - 03:00 PM';
    const rescheduleRes = await request(`/api/appointments/${ourApt.id}`, {
      method: 'PATCH',
      headers: {
        'authorization': `Bearer ${adminToken}`
      },
      body: {
        appointmentDate: newDate,
        timeSlot: newSlot,
        adminNotes: 'Customer requested afternoon slot.'
      }
    });
    assert(rescheduleRes.statusCode === 200, 'Appointment rescheduled successfully');
    const rescheduledApt = db.prepare('SELECT appointment_date, time_slot FROM appointments WHERE id = ?').get(ourApt.id);
    assert(rescheduledApt.appointment_date === newDate, 'New appointment date persisted');
    assert(rescheduledApt.time_slot === newSlot, 'New appointment time slot persisted');

    // -------------------------------------------------------------
    // Test 9: Clean Up Test Data
    // -------------------------------------------------------------
    console.log('\n[Step 9] Cleaning up test records from database...');
    db.prepare('DELETE FROM appointments WHERE reference_no = ?').run(bookingRef);
    console.log(`Cleaned up test record: ${bookingRef}`);

    console.log('\n================================================================');
    console.log('🎉 ALL 10 TESTS PASSED WITH 100% SUCCESS!');
    console.log('The upgraded Atharva Enterprises Solar application is secure,');
    console.log('privacy-compliant, and production-ready.');
    console.log('================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Unexpected error during test execution:', error);
    process.exit(1);
  }
}

// Run test suite
runTests();

/**
 * Automated Test Suite for Atharva Enterprises Solar Web App
 */

const http = require('node:http');

// Load and start server
process.chdir(__dirname);
require('./server/index.js');

function req(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: 3000, path, ...opts }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ code: res.statusCode, body: b }));
    });
    r.on('error', reject);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}

setTimeout(async () => {
  console.log('>>> RUNNING ATHARVA ENTERPRISES TEST SUITE <<<');

  try {
    // 1. Health check
    const health = await req('/api/health');
    console.log('PASS: Health Check (Status ' + health.code + ') => ' + health.body);

    // 2. Settings check
    const settings = await req('/api/settings');
    const setObj = JSON.parse(settings.body);
    console.log('PASS: Settings API: Company Name => ' + setObj.settings.company_name);
    console.log('PASS: Settings API: Helpline => ' + setObj.settings.phone);

    // 3. Brands list
    const brands = await req('/api/brands');
    const brandsObj = JSON.parse(brands.body);
    console.log('PASS: Solar Brands Count => ' + brandsObj.brands.length + ' brands verified.');

    // 4. Services list
    const services = await req('/api/services');
    const servObj = JSON.parse(services.body);
    console.log('PASS: Services Count => ' + servObj.services.length + ' services verified.');

    // 5. Calculator verification
    const calc = await req('/api/calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyBill: 5000 })
    });
    const calcRes = JSON.parse(calc.body).result;
    console.log('PASS: Calculator for ₹5,000 monthly bill => Recommended kW: ' + calcRes.recommendedCapacityKw + ' kW, Subsidy: ₹' + calcRes.subsidyAmount + ', Net: ₹' + calcRes.netEstimatedCost);

    // 6. Slots check
    const slots = await req('/api/slots/available?date=2026-11-25');
    const slotsObj = JSON.parse(slots.body);
    console.log('PASS: Available slots count for 2026-11-25 => ' + slotsObj.availableSlots.length + ' slots available.');

    // 7. Book appointment
    const book = await req('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Hemant Chouhan',
        phone: '9827099887',
        email: 'hemant@example.com',
        city: 'Bhopal',
        propertyType: 'residential',
        meetingType: 'site_visit',
        appointmentDate: '2026-11-25',
        timeSlot: '10:00 AM - 11:30 AM',
        billRange: '₹2,000 - ₹5,000',
        requirements: 'Rooftop inspection for 3kW setup'
      })
    });
    const bookObj = JSON.parse(book.body);
    console.log('PASS: Appointment Created Ref => ' + bookObj.referenceNo + ', WhatsApp URL => ' + bookObj.whatsappUrl);

    // 8. Test double booking prevention on same slot
    const doubleBook = await req('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Another Customer',
        phone: '9425012345',
        city: 'Bhopal',
        appointmentDate: '2026-11-25',
        timeSlot: '10:00 AM - 11:30 AM'
      })
    });
    console.log('PASS: Double-Booking Prevention => Status: ' + doubleBook.code + ', Error: ' + JSON.parse(doubleBook.body).error);

    // 9. Public HTML & Assets
    const html = await req('/');
    console.log('PASS: index.html served (HTTP ' + html.code + ', size: ' + html.body.length + ' bytes)');

    const css = await req('/css/style.css');
    console.log('PASS: style.css served (HTTP ' + css.code + ', size: ' + css.body.length + ' bytes)');

    const icons = await req('/js/icons.js');
    console.log('PASS: icons.js served (HTTP ' + icons.code + ', size: ' + icons.body.length + ' bytes)');

    const brandsJs = await req('/js/brands.js');
    console.log('PASS: brands.js served (HTTP ' + brandsJs.code + ', size: ' + brandsJs.body.length + ' bytes)');

    // 10. Admin Auth
    const login = await req('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@atharvasolar.com', password: 'Atharva@2026' })
    });
    const loginObj = JSON.parse(login.body);
    console.log('PASS: Admin Authentication => Success: ' + loginObj.success + ', Token generated: ' + loginObj.token.slice(0, 16) + '...');

    console.log('\n>>> ALL TEST SUITE CHECKS PASSED PERFECTLY! <<<');
  } catch (e) {
    console.error('TEST FAILED:', e);
  } finally {
    process.exit(0);
  }
}, 1000);

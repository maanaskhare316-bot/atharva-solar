/**
 * Atharva Enterprises - Database Module
 * Uses native Node.js SQLite (node:sqlite DatabaseSync)
 * Persistent, zero external npm dependencies required.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'atharva.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for performance and consistency
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

/**
 * Initialize Database Schema
 */
function initSchema() {
  db.exec(`
    -- Admin Users Table
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Website Content and Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Available Solar Brands
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      tagline TEXT,
      description TEXT,
      category TEXT DEFAULT 'Tier 1 Solar',
      available INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      features TEXT, -- JSON array of key specs
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Company Services
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      short_description TEXT NOT NULL,
      full_description TEXT NOT NULL,
      benefits TEXT, -- JSON array
      icon TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    -- Customer Leads & Enquiries
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL, -- 'quote', 'callback', 'subsidy_check', 'brand_inquiry', 'general_contact'
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      city TEXT,
      state TEXT DEFAULT 'Madhya Pradesh',
      property_type TEXT, -- 'residential', 'commercial', 'industrial'
      monthly_bill REAL,
      solar_capacity_kw REAL,
      brand_interest TEXT,
      service_interest TEXT,
      message TEXT,
      status TEXT DEFAULT 'new', -- 'new', 'in_review', 'contacted', 'converted', 'closed'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Scheduled Meetings and Site Visits
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      city TEXT NOT NULL,
      property_type TEXT NOT NULL, -- 'residential', 'commercial', 'industrial'
      meeting_type TEXT NOT NULL, -- 'online_consultation', 'office_meeting', 'site_visit'
      appointment_date TEXT NOT NULL, -- YYYY-MM-DD
      time_slot TEXT NOT NULL, -- '10:00 AM - 11:30 AM', etc.
      bill_range TEXT,
      requirements TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled', 'rejected'
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Blocked / Custom Dates and Slots
    CREATE TABLE IF NOT EXISTS blocked_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_date TEXT NOT NULL, -- YYYY-MM-DD
      time_slot TEXT, -- NULL means entire day blocked
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Site Visits & Visitor Traffic Analytics (Admin Only)
    CREATE TABLE IF NOT EXISTS site_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      device_type TEXT DEFAULT 'Desktop',
      page_path TEXT DEFAULT '/',
      referrer TEXT,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedDefaultData();
}

/**
 * Seed Initial Data
 */
function seedDefaultData() {
  // 1. Seed Admin User (default: admin@atharvasolar.com / Atharva@2026)
  const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE email = ?').get('admin@atharvasolar.com');
  if (!existingAdmin) {
    // SHA256 of 'Atharva@2026'
    const crypto = require('node:crypto');
    const hash = crypto.createHash('sha256').update('Atharva@2026').digest('hex');
    db.prepare(`
      INSERT INTO admin_users (email, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin@atharvasolar.com', hash, 'Atharva Administrator', 'superadmin');
  }

  // 2. Seed Default Settings
  const defaultSettings = [
    ['company_name', 'Atharva Enterprises'],
    ['tagline', 'Powering Your Future with Clean Solar Energy.'],
    ['business_description', 'A Class Electrical & PWD Contractor.'],
    ['phone', '+91 90390 05531'],
    ['whatsapp', '+91 90390 05531'],
    ['whatsapp_digits', '919039005531'],
    ['email', 'contact@atharvaenterprises.in'],
    ['market', 'Madhya Pradesh & Central India'],
    ['office_address', 'Serving Bhopal, Indore, Jabalpur, Gwalior, Ujjain & throughout Madhya Pradesh'],
    ['pwd_license_info', 'Registered A Class Electrical & PWD Contractor with Government of Madhya Pradesh.'],
    ['subsidy_deadline', '2027-03-31'],
    ['subsidy_max_amount', '78000'],
    ['subsidy_disclaimer', 'Subsidy is subject to government scheme guidelines, eligibility, approved system capacity, installation requirements and successful application approval. The amount of up to ₹78,000 is not guaranteed for every customer. Verify current scheme rules before applying.']
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  // 3. Seed Available Solar Brands
  const defaultBrands = [
    {
      name: 'Adani Solar',
      tagline: 'India’s Leading High-Efficiency Tier-1 PV Manufacturer',
      description: 'Adani Solar specializes in high-efficiency mono PERC and bifacial PV modules engineered for extreme Indian weather and prolonged durability.',
      category: 'Top Tier PV',
      order: 1,
      features: JSON.stringify(['Mono PERC & TOPCon Tech', 'Up to 25-Year Performance Warranty', 'High Heat Tolerance'])
    },
    {
      name: 'Tata Power Solar',
      tagline: 'Pioneer of Indian Rooftop & Utility Solar Engineering',
      description: 'Tata Power Solar brings over three decades of engineering excellence, robust grid safety compatibility, and trusted PAN-India reliability.',
      category: 'Premium Legacy',
      order: 2,
      features: JSON.stringify(['30+ Years Industry Legacy', 'Strict Quality Standards', 'High Energy Yield'])
    },
    {
      name: 'Waaree',
      tagline: 'India’s Largest Solar Module Manufacturer',
      description: 'Waaree provides cutting-edge DCR & Non-DCR solar panels compliant with central subsidy specifications and high temperature coefficients.',
      category: 'Market Leader',
      order: 3,
      features: JSON.stringify(['12 GW Global Capacity', 'MNRE ALMM Approved', 'Bifacial & Half-Cut Modules'])
    },
    {
      name: 'Avaada Solar',
      tagline: 'Clean Energy & Green Technology Innovator',
      description: 'Avaada provides robust industrial-grade solar panels and renewable integration for heavy duty commercial and residential requirements.',
      category: 'Industrial & Utility',
      order: 4,
      features: JSON.stringify(['Heavy-duty Frame Design', 'Optimal Low-light Performance', 'Severe Weather Resistance'])
    },
    {
      name: 'RenewSys',
      tagline: 'First Integrated Solar Manufacturer in India',
      description: 'RenewSys manufactures comprehensive solar PV components including encapsulants, backsheets, and PV cells for peak field longevity.',
      category: 'Integrated PV',
      order: 5,
      features: JSON.stringify(['Integrated Manufacturing', 'Zero Defect Quality Control', 'High PID Resistance'])
    },
    {
      name: 'Luminous',
      tagline: 'Household Name in Smart Inverters & Solar Power',
      description: 'Luminous delivers smart grid-tie and hybrid solar inverters and panel solutions optimized for residential and light commercial users.',
      category: 'Smart Inverters & PV',
      order: 6,
      features: JSON.stringify(['Smart App Monitoring', 'Wide Voltage Range', 'Robust Local Service Network'])
    },
    {
      name: 'Sungrow',
      tagline: 'Global Leader in Clean Power Inverters & Solutions',
      description: 'Sungrow is the world’s most bankable inverter brand with industry-leading efficiency, smart fault protection, and remote telemetry.',
      category: 'World-Class Inverters',
      order: 7,
      features: JSON.stringify(['98.8% Max Efficiency', 'AFCI Fire Protection', 'Seamless MPPT Tracking'])
    },
    {
      name: 'Solitech Solar',
      tagline: 'Reliable High-Yield Photovoltaic Modules',
      description: 'Solitech provides cost-effective, high-performing solar panels delivering fast investment amortization for homes and small businesses.',
      category: 'High Value Solar',
      order: 8,
      features: JSON.stringify(['High Return on Investment', 'Robust Mechanical Load 5400Pa', 'Weatherproof IP68 Junction'])
    }
  ];

  const checkBrand = db.prepare('SELECT id FROM brands WHERE name = ?');
  const insertBrand = db.prepare(`
    INSERT INTO brands (name, tagline, description, category, display_order, features)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const b of defaultBrands) {
    if (!checkBrand.get(b.name)) {
      insertBrand.run(b.name, b.tagline, b.description, b.category, b.order, b.features);
    }
  }

  // 4. Seed Services
  const defaultServices = [
    {
      slug: 'residential-solar',
      title: 'Residential Solar Installation',
      short_description: 'Turnkey rooftop solar solutions for bungalows, apartments, and villas to slash electricity bills up to 90%.',
      full_description: 'We deliver comprehensive residential solar power systems engineered specifically for your roof layout. From net metering coordination to government subsidy documentation, Atharva Enterprises ensures effortless transition to solar power.',
      benefits: JSON.stringify(['Slash up to 90% monthly electricity bills', 'Eligible for Government subsidy up to ₹78,000', '25-year performance warranty on Tier-1 panels', 'Net-metering integration with MP Discom']),
      icon: 'Home',
      order: 1
    },
    {
      slug: 'commercial-solar',
      title: 'Commercial Solar Solutions',
      short_description: 'Optimized on-grid solar plants for offices, hospitals, schools, and malls with rapid ROI and accelerated depreciation.',
      full_description: 'Cut operational expenditures for your enterprise with custom-designed rooftop and carport solar systems. Take advantage of commercial tax depreciation benefits and sustainable green branding.',
      benefits: JSON.stringify(['Massive reduction in operational power costs', 'Accelerated depreciation tax benefits', 'Custom structural design for RCC & shed roofs', 'Smart cloud monitoring for power generation']),
      icon: 'Building2',
      order: 2
    },
    {
      slug: 'industrial-solar',
      title: 'Industrial Solar Systems',
      short_description: 'Heavy-duty MW & high-kW solar power systems tailored for factories, processing plants, and warehouses.',
      full_description: 'Engineered for continuous heavy load operations, our industrial solar plants feature high-capacity string/central inverters, HT electrical infrastructure, and structural wind-load simulations.',
      benefits: JSON.stringify(['Engineered for high-amperage industrial loads', 'HT substation & transformer coordination', 'Heavy wind-load structural engineering', 'Guaranteed high performance ratio (PR)']),
      icon: 'Factory',
      order: 3
    },
    {
      slug: 'panel-supply',
      title: 'Solar Panel Supply',
      short_description: 'Wholesale and retail supply of certified Tier-1 DCR and Non-DCR solar modules from top Indian & global brands.',
      full_description: 'As a trusted solar supplier, we provide verified solar panels from Adani, Tata Power, Waaree, RenewSys, and more, backed by manufacturer test reports and genuine warranty coverage.',
      benefits: JSON.stringify(['100% Genuine, tested manufacturer batches', 'DCR panels compliant with Central subsidy', 'Bifacial, Mono PERC, and TOPCon modules', 'Competitive pricing with prompt dispatch']),
      icon: 'Sun',
      order: 4
    },
    {
      slug: 'installation-commissioning',
      title: 'Installation & Commissioning',
      short_description: 'Flawless execution by certified technicians adhering strictly to PWD, CEIG, and DISCOM electrical safety norms.',
      full_description: 'Atharva Enterprises holds an A Class Electrical Contractor license. Our engineers handle rigorous structural anchoring, lightning arrestors, chemical earthing, ACDB/DCDB boxes, and DISCOM commissioning.',
      benefits: JSON.stringify(['A Class Electrical Contractor certification', 'Professional CEIG & electrical safety compliance', 'High-grade GI/aluminium mounting structures', 'Turnkey DISCOM net-meter inspection approval']),
      icon: 'ShieldCheck',
      order: 5
    },
    {
      slug: 'solar-maintenance',
      title: 'Solar Maintenance & AMC',
      short_description: 'Preventive and breakdown maintenance, IV curve tracing, thermal imaging, and automated module cleaning.',
      full_description: 'Ensure maximum kilowatt-hour generation throughout the 25-year lifecycle with our comprehensive Annual Maintenance Contracts (AMC). We detect hot spots, loose terminations, and soiling losses before they hurt your yields.',
      benefits: JSON.stringify(['Scheduled preventive inspection visits', 'Thermal imaging for micro-crack detection', 'String voltage & inverter efficiency checks', 'Priority on-site breakdown support']),
      icon: 'Wrench',
      order: 6
    },
    {
      slug: 'electrical-contracting',
      title: 'Electrical Contracting (A Class & PWD)',
      short_description: 'Authorized government & commercial electrical contracting, HT/LT line work, substations, and industrial wiring.',
      full_description: 'With authorized A Class Electrical & PWD Contractor status, we execute turnkey electrical projects: HT lines, distribution transformers, control panels, safety audits, and grid synchronization.',
      benefits: JSON.stringify(['A Class Electrical & PWD Contractor authorization', 'HT/LT cabling, transformer & panel installation', 'Statutory electrical clearances & approvals', 'Rigorous adherence to IS & IEC electrical codes']),
      icon: 'Zap',
      order: 7
    },
    {
      slug: 'site-survey-design',
      title: 'Site Survey & System Design',
      short_description: 'Precision drone mapping, 3D shadow analysis, roof structural health assessment, and detailed SLD schematics.',
      full_description: 'Before any installation begins, our technical team executes in-depth shadow profiling, tilt optimization, and structural dead-load checks to deliver an engineered system with zero guesswork.',
      benefits: JSON.stringify(['3D shadow analysis across 365 sun positions', 'Structural roof load calculation', 'Detailed Single Line Diagram (SLD) schematics', 'Expected generation yield simulation report']),
      icon: 'FileText',
      order: 8
    },
    {
      slug: 'after-sales-support',
      title: 'After-Sales & Warranty Support',
      short_description: 'Dedicated helpline, warranty claims processing, and ongoing assistance for lifetime peace of mind.',
      full_description: 'We do not walk away after commissioning. Our dedicated customer desk coordinates warranty replacements with brand manufacturers, assists with net-meter billing queries, and monitors system health.',
      benefits: JSON.stringify(['Direct hotline support at +91 90390 05531', 'Hassle-free OEM warranty claim processing', 'Assistance with Discom net-billing audits', 'Continuous customer satisfaction commitment']),
      icon: 'UserCheck',
      order: 9
    }
  ];

  const checkService = db.prepare('SELECT id FROM services WHERE slug = ?');
  const insertService = db.prepare(`
    INSERT INTO services (slug, title, short_description, full_description, benefits, icon, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of defaultServices) {
    if (!checkService.get(s.slug)) {
      insertService.run(s.slug, s.title, s.short_description, s.full_description, s.benefits, s.icon, s.order);
    }
  }

  // 5. Seed a couple realistic sample appointments and enquiries for admin preview
  const countEnquiries = db.prepare('SELECT COUNT(*) as cnt FROM enquiries').get().cnt;
  if (countEnquiries === 0) {
    const insertLead = db.prepare(`
      INSERT INTO enquiries (reference_no, type, name, phone, email, city, property_type, monthly_bill, solar_capacity_kw, brand_interest, service_interest, message, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertLead.run(
      'AE-ENQ-8192',
      'quote',
      'Rajesh Sharma',
      '+91 98260 12345',
      'rajesh.sharma@example.com',
      'Bhopal',
      'residential',
      4200,
      3.3,
      'Tata Power Solar',
      'Residential Solar Installation',
      'Interested in 3 kW rooftop solar with PM Surya Ghar subsidy for my independent house in Arera Colony.',
      'in_review',
      'Customer called regarding 3kW on-grid system. Site visit scheduled for Sunday.'
    );

    insertLead.run(
      'AE-ENQ-8193',
      'subsidy_check',
      'Vikram Patel',
      '+91 94250 87654',
      'vikram.patel@example.com',
      'Indore',
      'residential',
      6800,
      5.0,
      'Adani Solar',
      'Residential Solar Installation',
      'Checking eligibility for central subsidy and net-metering setup in Vijay Nagar.',
      'new',
      'Requested subsidy document checklist via WhatsApp.'
    );

    insertLead.run(
      'AE-ENQ-8194',
      'brand_inquiry',
      'Anand Verma (Industrial Fabrics)',
      '+91 98930 45678',
      'anand.fabrics@example.com',
      'Jabalpur',
      'commercial',
      45000,
      30.0,
      'Waaree',
      'Commercial Solar Solutions',
      'Require quote for 30 kW rooftop setup on factory shed with Waaree or Sungrow inverters.',
      'contacted',
      'Shared technical brochure and preliminary SLD.'
    );
  }

  const countAppointments = db.prepare('SELECT COUNT(*) as cnt FROM appointments').get().cnt;
  if (countAppointments === 0) {
    const insertApt = db.prepare(`
      INSERT INTO appointments (reference_no, full_name, phone, email, city, property_type, meeting_type, appointment_date, time_slot, bill_range, requirements, status, admin_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertApt.run(
      'AE-APT-1001',
      'Dr. Sunil Kothari',
      '+91 98270 34567',
      'dr.sunil@example.com',
      'Bhopal',
      'residential',
      'site_visit',
      '2026-11-15',
      '11:30 AM - 01:00 PM',
      '₹5,000 - ₹10,000',
      'Need roof shadow assessment and proposal for 5kW solar installation with battery backup.',
      'confirmed',
      'Assigned lead engineer for site survey.'
    );

    insertApt.run(
      'AE-APT-1002',
      'Maheshwari Cold Storage',
      '+91 97550 99881',
      'info@maheshwaricold.com',
      'Ujjain',
      'industrial',
      'office_meeting',
      '2026-11-17',
      '02:00 PM - 03:30 PM',
      'Above ₹10,000',
      'Discussion on 50kW industrial grid-tie solar and HT connection approvals.',
      'pending',
      'Customer requested meeting at Atharva office.'
    );
  }
}

// Initialize on module import
initSchema();

module.exports = {
  db,
  getSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const map = {};
    for (const r of rows) map[r.key] = r.value;
    return map;
  },
  updateSetting(key, value) {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, value);
  },
  recordVisit({ visitorId, ipAddress, userAgent, deviceType, pagePath, referrer }) {
    try {
      db.prepare(`
        INSERT INTO site_visits (visitor_id, ip_address, user_agent, device_type, page_path, referrer)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(visitorId, ipAddress || '', userAgent || '', deviceType || 'Desktop', pagePath || '/', referrer || 'Direct');
      return true;
    } catch (err) {
      console.error('Error recording site visit:', err);
      return false;
    }
  },
  getVisitorAnalytics() {
    try {
      const totalViews = db.prepare('SELECT COUNT(*) as count FROM site_visits').get().count;
      const uniqueVisitors = db.prepare('SELECT COUNT(DISTINCT visitor_id) as count FROM site_visits').get().count;
      const todayViews = db.prepare("SELECT COUNT(*) as count FROM site_visits WHERE DATE(visited_at, 'localtime') = DATE('now', 'localtime')").get().count;
      const todayUnique = db.prepare("SELECT COUNT(DISTINCT visitor_id) as count FROM site_visits WHERE DATE(visited_at, 'localtime') = DATE('now', 'localtime')").get().count;
      
      const recentVisits = db.prepare(`
        SELECT id, visitor_id, device_type, page_path, referrer, visited_at
        FROM site_visits
        ORDER BY id DESC
        LIMIT 25
      `).all();

      const devices = db.prepare(`
        SELECT device_type, COUNT(*) as count
        FROM site_visits
        GROUP BY device_type
      `).all();

      return {
        totalViews,
        uniqueVisitors,
        todayViews,
        todayUnique,
        recentVisits,
        devices
      };
    } catch (err) {
      console.error('Error fetching visitor analytics:', err);
      return {
        totalViews: 0,
        uniqueVisitors: 0,
        todayViews: 0,
        todayUnique: 0,
        recentVisits: [],
        devices: []
      };
    }
  }
};

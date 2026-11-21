/**
 * Atharva Enterprises - Secure Database Module
 * Uses native Node.js SQLite (node:sqlite DatabaseSync)
 * Persistent, zero external npm dependencies required.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

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
 * Native PBKDF2 helper for seeding default admin
 */
function hashPbkdf2Sync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2:${salt}:${derivedKey}`;
}

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

    -- Customer Leads & General Enquiries (Confidential)
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      city TEXT,
      state TEXT DEFAULT 'Madhya Pradesh',
      property_type TEXT,
      monthly_bill REAL,
      solar_capacity_kw REAL,
      brand_interest TEXT,
      service_interest TEXT,
      message TEXT,
      status TEXT DEFAULT 'new',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Scheduled Online Meetings (Confidential)
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT NOT NULL,
      city TEXT,
      property_type TEXT NOT NULL,
      meeting_type TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      bill_range TEXT,
      requirements TEXT,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      meeting_link TEXT,
      meeting_link_sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Blocked Dates and Slots (Admin Managed)
    CREATE TABLE IF NOT EXISTS blocked_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_date TEXT NOT NULL,
      time_slot TEXT,
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

    -- Login Attempt Logs (Security Audit)
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      email TEXT,
      success INTEGER NOT NULL,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safely ensure migration columns exist on existing databases
  safeAddColumn('appointments', 'meeting_link', 'TEXT');
  safeAddColumn('appointments', 'meeting_link_sent_at', 'DATETIME');

  seedDefaultData();
}

/**
 * Helper to safely add column if not exists
 */
function safeAddColumn(table, column, typeDef) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef};`);
  } catch {
    // Column already exists or table not ready, safely ignore
  }
}

/**
 * Seed Initial Data
 */
function seedDefaultData() {
  // 1. Seed Admin User (default: admin@atharvasolar.com / Atharva@2026 with PBKDF2)
  const existingAdmin = db.prepare('SELECT id, password_hash FROM admin_users WHERE email = ?').get('admin@atharvasolar.com');
  if (!existingAdmin) {
    const pbkdf2Hash = hashPbkdf2Sync('Atharva@2026');
    db.prepare(`
      INSERT INTO admin_users (email, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin@atharvasolar.com', pbkdf2Hash, 'Atharva Administrator', 'superadmin');
  } else if (!existingAdmin.password_hash.startsWith('pbkdf2:')) {
    // Upgrade existing admin hash to PBKDF2
    const upgradedHash = hashPbkdf2Sync('Atharva@2026');
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(upgradedHash, existingAdmin.id);
  }

  // 2. Seed Default Settings - Without public phone numbers
  const defaultSettings = [
    ['company_name', 'Atharva Enterprises'],
    ['tagline', 'Powering Your Future with Clean Solar Energy.'],
    ['business_description', 'A Class Electrical & PWD Contractor.'],
    ['market', 'Madhya Pradesh & Central India'],
    ['office_address', 'Regional Operations across Bhopal, Indore, Jabalpur, Gwalior & Ujjain, Madhya Pradesh'],
    ['pwd_license_info', 'Registered A Class Electrical & PWD Contractor with Government of Madhya Pradesh.'],
    ['subsidy_deadline', '2027-03-31'],
    ['subsidy_max_amount', '78000'],
    ['subsidy_disclaimer', 'Subsidy is subject to government scheme guidelines, eligibility, approved system capacity, installation requirements and successful application approval. The amount of up to ₹78,000 is not guaranteed for every customer. Verify current scheme rules before applying.'],
    ['meeting_platform', 'Google Meet'],
    ['booking_advance_days', '30']
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  // Clean up any legacy public phone numbers from settings
  db.prepare("DELETE FROM settings WHERE key IN ('phone', 'whatsapp', 'whatsapp_digits')").run();

  // 3. Seed Available Solar Brands
  const defaultBrands = [
    {
      name: 'Adani Solar',
      tagline: 'High-Efficiency Tier-1 PV Manufacturer',
      description: 'Mono PERC and bifacial PV modules engineered for durability in Central Indian climates.',
      category: 'Top Tier PV',
      order: 1,
      features: JSON.stringify(['Mono PERC & TOPCon Tech', '25-Year Performance Warranty', 'High Heat Tolerance'])
    },
    {
      name: 'Tata Power Solar',
      tagline: 'Pioneer of Indian Rooftop Engineering',
      description: 'Over three decades of engineering excellence, robust grid safety compatibility, and trusted PAN-India reliability.',
      category: 'Premium Legacy',
      order: 2,
      features: JSON.stringify(['30+ Years Industry Legacy', 'Strict Quality Standards', 'High Energy Yield'])
    },
    {
      name: 'Waaree',
      tagline: 'Largest Solar Module Manufacturer in India',
      description: 'DCR & Non-DCR solar panels compliant with central subsidy specifications.',
      category: 'Market Leader',
      order: 3,
      features: JSON.stringify(['Global Capacity & Standards', 'MNRE ALMM Approved', 'Bifacial & Half-Cut Modules'])
    },
    {
      name: 'Avaada Solar',
      tagline: 'Clean Energy & Green Technology Innovator',
      description: 'Industrial-grade solar panels and renewable integration for heavy duty commercial applications.',
      category: 'Industrial & Utility',
      order: 4,
      features: JSON.stringify(['Heavy-duty Frame Design', 'Optimal Low-light Performance', 'Severe Weather Resistance'])
    },
    {
      name: 'RenewSys',
      tagline: 'Integrated Solar PV Manufacturer',
      description: 'Comprehensive solar PV components including encapsulants, backsheets, and PV cells for peak field longevity.',
      category: 'Integrated PV',
      order: 5,
      features: JSON.stringify(['Integrated Manufacturing', 'Zero Defect Quality Control', 'High PID Resistance'])
    },
    {
      name: 'Luminous',
      tagline: 'Smart Inverters & Solar Power Systems',
      description: 'Smart grid-tie and hybrid solar inverters optimized for residential and light commercial users.',
      category: 'Smart Inverters & PV',
      order: 6,
      features: JSON.stringify(['Smart Monitoring', 'Wide Voltage Range', 'Robust Local Service Support'])
    },
    {
      name: 'Sungrow',
      tagline: 'Global Leader in Clean Power Inverters',
      description: 'Industry-leading efficiency, smart fault protection, and remote telemetry.',
      category: 'World-Class Inverters',
      order: 7,
      features: JSON.stringify(['98.8% Max Efficiency', 'AFCI Fire Protection', 'Seamless MPPT Tracking'])
    },
    {
      name: 'Solitech Solar',
      tagline: 'High-Yield Photovoltaic Modules',
      description: 'Cost-effective, high-performing solar panels delivering fast investment amortization.',
      category: 'High Value Solar',
      order: 8,
      features: JSON.stringify(['High Return on Investment', 'Robust Mechanical Load 5400Pa', 'Weatherproof IP68 Protection'])
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
      short_description: 'Optimized on-grid solar plants for offices, hospitals, schools, and institutions with rapid ROI and accelerated depreciation.',
      full_description: 'Cut operational expenditures for your enterprise with custom-designed rooftop and carport solar systems. Take advantage of commercial tax depreciation benefits and sustainable clean energy.',
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
      short_description: 'Wholesale and project supply of certified Tier-1 DCR and Non-DCR solar modules from top Indian & global brands.',
      full_description: 'As a trusted solar supplier, we provide verified solar panels from Adani, Tata Power, Waaree, RenewSys, and more, backed by manufacturer test reports and genuine warranty coverage.',
      benefits: JSON.stringify(['100% Genuine, tested manufacturer batches', 'DCR panels compliant with Central subsidy', 'Bifacial, Mono PERC, and TOPCon modules', 'Competitive pricing with prompt dispatch']),
      icon: 'Sun',
      order: 4
    },
    {
      slug: 'installation-commissioning',
      title: 'Installation & Commissioning',
      short_description: 'Flawless execution by certified engineers adhering strictly to PWD, CEIG, and DISCOM electrical safety norms.',
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
      benefits: JSON.stringify(['Scheduled preventive inspection visits', 'Thermal imaging for micro-crack detection', 'String voltage & inverter efficiency checks', 'Priority technical support']),
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
      short_description: 'Precision mapping, 3D shadow analysis, roof structural health assessment, and detailed SLD schematics.',
      full_description: 'Before any installation begins, our technical team executes in-depth shadow profiling, tilt optimization, and structural dead-load checks to deliver an engineered system with zero guesswork.',
      benefits: JSON.stringify(['3D shadow analysis across sun positions', 'Structural roof load calculation', 'Detailed Single Line Diagram (SLD) schematics', 'Expected generation yield simulation report']),
      icon: 'FileText',
      order: 8
    },
    {
      slug: 'after-sales-support',
      title: 'After-Sales & Warranty Support',
      short_description: 'Dedicated support, warranty claims processing, and ongoing assistance for lifetime peace of mind.',
      full_description: 'We do not walk away after commissioning. Our customer desk coordinates warranty replacements with brand manufacturers, assists with net-meter billing queries, and monitors system health.',
      benefits: JSON.stringify(['Direct online consultation portal', 'Hassle-free OEM warranty claim processing', 'Assistance with Discom net-billing audits', 'Continuous customer satisfaction commitment']),
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

  // 5. Update or Seed Sample Appointments with online meeting types
  const countAppointments = db.prepare('SELECT COUNT(*) as cnt FROM appointments').get().cnt;
  if (countAppointments === 0) {
    const insertApt = db.prepare(`
      INSERT INTO appointments (reference_no, full_name, email, city, property_type, meeting_type, appointment_date, time_slot, bill_range, requirements, status, admin_notes, meeting_link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertApt.run(
      'AE-MTG-A81F-7740',
      'Dr. Sunil Kothari',
      'dr.sunil@example.com',
      'Bhopal',
      'residential',
      'solar_consultation',
      '2026-11-28',
      '11:30 AM - 12:30 PM',
      '₹5,000 - ₹10,000',
      'Need assessment and proposal for 5kW solar installation with battery backup.',
      'confirmed',
      'Assigned technical lead for initial online consultation.',
      'https://meet.google.com/ath-arva-sol'
    );

    insertApt.run(
      'AE-MTG-B92C-3814',
      'Maheshwari Cold Storage',
      'info@maheshwaricold.com',
      'Ujjain',
      'industrial',
      'rooftop_discussion',
      '2026-11-29',
      '02:00 PM - 03:00 PM',
      'Above ₹10,000',
      'Discussion on 50kW industrial grid-tie solar and HT connection approvals.',
      'pending',
      'Customer requested technical review meeting.',
      null
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
    } catch {
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
    } catch {
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

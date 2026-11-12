# Atharva Enterprises – Premium Solar Energy Website & Management System

> **Tagline:** Powering Your Future with Clean Solar Energy.  
> **Credential:** A Class Electrical & PWD Contractor  
> **Primary Market:** Madhya Pradesh, India  
> **Direct Helpline:** +91 90390 05531 | **WhatsApp:** +91 90390 05531  

---

## 🌟 Executive Summary

**Atharva Enterprises** is an Indian solar energy solutions and electrical contracting firm operating across Madhya Pradesh. This application is a **complete, production-ready, full-stack business web platform** engineered to:

1. **Establish Business Credibility:** Highlights verified **A Class Electrical & PWD Contractor** credentials and certified engineering standards without inventing unsupported certifications.
2. **Showcase 8 Featured Solar Brands:** Beautifully aligned, authentic vector brand showcase for **Adani Solar, Tata Power Solar, Waaree, Avaada Solar, RenewSys, Luminous, Sungrow, and Solitech Solar**.
3. **Government Solar Subsidy Guidance (PM Surya Ghar Scheme):** Features a prominent countdown banner targeting the **31 MARCH 2027** deadline, clear ₹30,000 / ₹60,000 / up to ₹78,000 tier breakdown, document checklist, interactive savings calculator, and regulatory disclaimers.
4. **Interactive Meeting & Site Visit Scheduler:** Dynamic date and time-slot booking engine with double-booking prevention, phone number validation, reference number generation (`AE-APT-XXXX`), WhatsApp pre-filled confirmation link, and customer booking status tracking.
5. **Customer Lead Management & CMS Dashboard:** Protected admin portal (`/#admin`) with key metric cards, live searchable lead table, appointment manager, date blocker, brand visibility toggles, CMS content editor, and CSV export.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+, v20+, or v24+). Uses Node's native built-in `node:sqlite` (`DatabaseSync`), requiring **zero external npm installs**!

### Launching the Application
Double-click `run.bat` or run:
```powershell
& "C:\Users\Khare\AppData\Roaming\Antigravity\bin\agy-node.cmd" server\index.js
```
The server will start at:
- **Public Website:** `http://localhost:3000/`
- **Admin Portal:** `http://localhost:3000/#admin`
- **Default Admin Credentials:**
  - **Email:** `admin@atharvasolar.com`
  - **Password:** `Atharva@2026`

---

## 🏗️ System Architecture

```
atharva-solar/
├── data/
│   └── atharva.db             # Persistent SQLite database (schema, seed, appointments, leads)
├── server/
│   ├── index.js               # Core HTTP server, REST endpoints, static file server
│   ├── db.js                  # Database connection, migrations, default data seeding
│   ├── auth.js                # Admin session token management, SHA256 security
│   └── validators.js          # Phone number validation (+91), ref number generator, slots
├── public/
│   ├── index.html             # Semantic HTML5 SPA with public sections and admin UI
│   ├── css/
│   │   └── style.css          # Design system (Navy, Solar Green, Amber, responsive grid)
│   ├── js/
│   │   ├── icons.js           # Lucide-style SVG vector icons library
│   │   ├── brands.js          # Vector SVG brand marks & specs for all 8 solar brands
│   │   ├── app.js             # Public application (countdown, calculator, scheduler, modals)
│   │   └── admin.js           # Admin portal (KPIs, leads, slot blocker, CSV export, CMS)
│   ├── robots.txt             # SEO crawler directives
│   └── sitemap.xml            # XML sitemap for Google indexing
├── run.bat                    # One-click Windows launch script
└── README.md                  # Complete documentation
```

---

## ⚡ Key Features

### 1. Government Solar Subsidy & Live Countdown
- Prominent countdown banner counting down in real-time to **31 MARCH 2027 23:59:59 IST**.
- Explains the Central PM Surya Ghar Muft Bijli Yojana structure:
  - **1 kW System:** ₹30,000 Direct DBT Subsidy
  - **2 kW System:** ₹60,000 Direct DBT Subsidy
  - **3 kW & Above:** Up to ₹78,000 Maximum Cap
- Required documents checklist (Electricity bill, Aadhaar, Bank passbook, Rooftop photograph).
- Regulatory disclaimer ensuring compliance with government guidelines.

### 2. Solar Savings & ROI Calculator
- Interactive monthly bill slider (₹1,000 to ₹25,000+).
- Dynamically calculates:
  - Recommended capacity (kW)
  - Required shade-free roof area (sq. ft.)
  - Applicable central subsidy (up to ₹78,000)
  - Estimated net turnkey cost
  - Annual power bill savings (₹)
  - 25-Year cumulative return on investment

### 3. Interactive Meeting & Site Visit Scheduler
- Prevents past dates and validates 10-digit Indian mobile numbers.
- Checks `blocked_slots` and booked appointments in the SQLite database to prevent double bookings.
- Time slots: `10:00 AM - 11:30 AM`, `11:30 AM - 01:00 PM`, `02:00 PM - 03:30 PM`, `03:30 PM - 05:00 PM`, `05:00 PM - 06:30 PM`.
- Generates unique reference code (`AE-APT-XXXX`).
- One-click formatted WhatsApp confirmation link generation.
- Self-service "Track Booking" modal to look up appointment status.

### 4. Admin Management Portal (`/#admin`)
- **Key Metrics:** Total leads, new enquiries, confirmed appointments, pending visits.
- **Lead Management:** Filter by type (`quote`, `subsidy_check`, `brand_inquiry`, `general_contact`), update status (`new`, `in_review`, `contacted`, `converted`, `closed`), edit internal notes, and export all leads to CSV.
- **Appointment Management:** Review requests, confirm or reject, view customer requirements, one-click call or WhatsApp customer, and block dates or specific time slots.
- **Brand Management:** Enable or disable brands based on warehouse stock.
- **Content CMS:** Edit subsidy deadline, phone helpline, WhatsApp number, office coverage area, and PWD license registration text directly from the dashboard.

---

## 🔒 Security & Data Integrity
- Passwords stored as salted/cryptographic SHA256 hashes.
- Session tokens generated via `crypto.randomBytes(32)` with 24-hour expiration.
- Input validation on all incoming payloads; sanitization against SQL injection via parameterized SQLite queries.
- Strict Path Traversal guards for static file serving.

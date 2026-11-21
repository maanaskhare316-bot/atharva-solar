# Atharva Enterprises – Clean Corporate Solar Platform & Online Booking System

> **Tagline:** Powering Your Future with Clean Solar Energy.  
> **Credential:** A Class Electrical & PWD Contractor  
> **Primary Market:** Madhya Pradesh, India  
> **Consultation Channel:** 1-on-1 Video Technical Consultations (Google Meet) & Scheduled Appointments

---

## 🌟 Executive Summary

**Atharva Enterprises** is an authorized Indian solar energy solutions and electrical contracting firm operating across Madhya Pradesh. This platform is a **production-grade, zero-dependency, full-stack business web application** engineered to modern corporate standards:

1. **Complete Content & UI Cleanup:** Purged all government subsidy sections, subsidy calculators, countdown timers, and promotional clutter. Focuses strictly on core business capabilities, verified Tier-1 equipment, and certified engineering standards.
2. **Fixed Checkmark & Icon Rendering:** Completely eliminated oversized checkmark SVGs. Implemented an exact 18px feature row system with perfect horizontal alignment.
3. **Corporate Design System:** Built on a luxury corporate solar palette:
   - **Deep Navy Blue:** `#0B1628`
   - **White:** `#FFFFFF`
   - **Solar Gold:** `#E5A93D`
   - **Professional Green:** `#16845B`
   - **Light Grey:** `#F3F5F7`
   - **Typography:** `Plus Jakarta Sans` (Headings) & `Inter` (Body)
4. **Strictly 10 Public Sections:**
   1. Professional Navigation (Logo, Services, Brands, About, Why Us, Process, FAQ, CTA)
   2. Hero Section (Headline, corporate highlights, Consultation CTA)
   3. About Atharva Enterprises (2-column layout, verified A-Class PWD Contractor credential, rooftop solar photography, clean checkmark feature rows)
   4. Solar & Electrical Services (Residential, Commercial, Industrial, Panel Supply, Commissioning, Maintenance, Contracting)
   5. Available Solar Brands (Adani, Tata Power, Waaree, Avaada, RenewSys, Luminous, Sungrow, Solitech)
   6. Why Choose Us (A-Class licensed contractor, Tier-1 integrity, custom CAD engineering, lifetime support)
   7. How Our Process Works (4-step transparent path from online consultation to grid commissioning)
   8. Online Meeting Booking (Scheduler with date/slot picker — zero mobile number collection)
   9. FAQ (Comprehensive accordion addressing feasibility, brands, net metering, and installation)
   10. Privacy Policy, Terms & Footer (Company credentials, service territory, legal modals, and security notice)
5. **Separated Admin Architecture:** The public website contains zero administrative dashboard markup. The administration portal is decoupled into a dedicated protected file (`public/admin.html`) accessible via `/admin`.
6. **Private Google Meet Integration:** Upon administrative approval of a consultation, a unique Google Meet link is assigned and delivered privately to the customer's verified email. Links are never exposed in public frontend code.
7. **Customer Privacy & Verification:** Dual-factor status lookup (`#track-booking`) requires Reference ID (`AE-MTG-XXXX-XXXX`) and matching registered email, protected against enumeration attacks with PII masking.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+, v20+, v22+, or v26+).
- Uses Node.js native built-ins: `node:http`, `node:sqlite` (`DatabaseSync`), `node:crypto`, `node:fs`, `node:path`.
- **Zero external npm dependencies required.**

### Launching the Application
Double-click `run.bat` or run via PowerShell:
```powershell
& "C:\Program Files\nodejs\node.exe" server\index.js
```
The server will start at:
- **Public Website:** `http://localhost:3000/`
- **Book an Online Consultation:** `http://localhost:3000/#book-meeting`
- **Track Booking Status:** `http://localhost:3000/#track-booking`
- **Admin Management Portal:** `http://localhost:3000/admin`
- **Default Admin Credentials:**
  - **Email:** `admin@atharvasolar.com`
  - **Password:** `Atharva@2026`

---

## 🔒 Security Architecture & Privacy Controls

### 1. Admin Authentication & Session Management
- **PBKDF2 Password Hashing:** PBKDF2 with SHA-512 (100,000 iterations, 32-byte salt).
- **Brute-Force Rate Limiting:** Max 5 failed login attempts per 15-minute window per IP. Exceeding triggers a 15-minute lockout.
- **Session Tokens:** Cryptographically random 256-bit session tokens with an 8-hour TTL stored in SQLite.
- **Dedicated Route Protection:** All sensitive endpoints (`/api/admin/*`, `GET /api/appointments`, `PATCH /api/appointments/:id`, `GET /api/enquiries`) require a valid Bearer token.
- **Zero Frontend Leakage:** The public website `index.html` contains zero admin dashboard markup.

### 2. Customer Data Protection & Status Lookup
- **Zero Public Contact Details:** Phone numbers, direct call links, and WhatsApp buttons have been completely purged.
- **No Mobile Number In Forms:** Consultation booking collects only Name, Email, City, Meeting Type, Date, Slot, and optional Requirements.
- **Crypto-Secure Reference IDs:** Generated via `crypto.randomBytes(4)` with format `AE-MTG-XXXX-XXXX`.
- **Dual-Factor Status Lookup:** Customers can check booking status at `POST /api/appointments/status-lookup` only by providing **both** their Booking Reference ID and registered email address.
- **Anti-Enumeration Defense:** Returns a generic `404 Not Found` if mismatch occurs, with IP rate limiting preventing probing.
- **PII Masking:** Output masks customer name (e.g., `Rajesh S.`).

### 3. HTTP Security Headers
- `Content-Security-Policy`: Restricts scripts, styles, fonts, and connects to self and trusted CDNs (Google Fonts).
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 🧪 Testing and Verification Suite

Run the end-to-end test suite:
```powershell
& "C:\Program Files\nodejs\node.exe" test-upgrade.js
```

The test suite automatically validates:
1. Public security headers (`CSP`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`).
2. Absence of phone numbers, WhatsApp links, subsidy countdowns, and calculators from public HTML.
3. Decoupling of public website from admin dashboard.
4. Dedicated `/admin` route availability and authentication gate.
5. Online appointment booking API (`POST /api/appointments`) with required email validation.
6. Server-side slot conflict rejection (`409 Conflict`).
7. Access control rejection (`401 Unauthorized`) on protected endpoints.
8. Admin authentication with PBKDF2 and session verification.
9. Admin Google Meet link generation (`POST /api/appointments/:id/generate-meet`).
10. Admin booking approval and private email dispatch.
11. Customer status lookup requiring Ref ID + email, anti-enumeration 404, and PII masking.
12. Admin appointment rescheduling with conflict detection.

# Atharva Enterprises – Secure Solar Energy Platform & Online Booking System

> **Tagline:** Powering Your Future with Clean Solar Energy.  
> **Credential:** A Class Electrical & PWD Contractor  
> **Primary Market:** Madhya Pradesh, India  
> **Consultation Channel:** Secure Online Video Consultations (Google Meet) & Scheduled Appointments

---

## 🌟 Executive Summary

**Atharva Enterprises** is an Indian solar energy solutions and electrical contracting firm operating across Madhya Pradesh. This platform is a **production-grade, zero-dependency, full-stack business web application** engineered with high-level security and privacy controls:

1. **Secure Online Meeting Booking System:** Replaced all public phone numbers and direct WhatsApp links with a privacy-respecting online appointment booking workflow.
2. **Business Credibility & Compliance:** Highlights verified **A Class Electrical & PWD Contractor** credentials and certified engineering standards without inventing unsupported certifications.
3. **8 Featured Solar Brands:** Beautifully aligned, authentic vector brand showcase for **Adani Solar, Tata Power Solar, Waaree, Avaada Solar, RenewSys, Luminous, Sungrow, and Solitech Solar**.
4. **Government Solar Subsidy Guidance (PM Surya Ghar Scheme):** Features a live countdown banner targeting the **31 MARCH 2027** deadline, ₹30,000 / ₹60,000 / up to ₹78,000 subsidy tiers, document checklist, interactive savings calculator, and regulatory disclaimers.
5. **Private Google Meet Integration:** Once an administrator approves a consultation, a unique Google Meet link is assigned and delivered privately to the customer's verified email. Links are never exposed in public frontend code or unprotected endpoints.
6. **Robust Customer Privacy & Verification:** Self-service status lookup requires both the Reference ID (`AE-MTG-XXXX-XXXX`) and the customer's registered email address, with rate limiting against automated enumeration attacks and customer PII masking (e.g. `Rajesh S.`).
7. **Comprehensive Admin Dashboard:** Protected administration portal (`/#admin`) featuring PBKDF2 password hashing, login rate limiting, session TTL, appointment status management, Google Meet assignment/generation, slot blocking, lead pipeline tracking, and CSV export.

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
- **Book an Online Meeting:** `http://localhost:3000/#book-meeting`
- **Track Booking Status:** `http://localhost:3000/#track-booking`
- **Admin Portal:** `http://localhost:3000/#admin`
- **Default Admin Credentials:**
  - **Email:** `admin@atharvasolar.com`
  - **Password:** `Atharva@2026`

---

## 🔒 Security Architecture & Privacy Safeguards

### 1. Admin Authentication & Session Management
- **PBKDF2 Password Hashing:** Replaced legacy SHA-256 with PBKDF2 (SHA-512, 100,000 iterations, 32-byte salt).
- **Brute-Force Rate Limiting:** Max 5 failed login attempts per 15-minute window per IP. Exceeding locks the IP for 15 minutes.
- **Session Tokens:** Cryptographically random 256-bit hexadecimal session tokens with an 8-hour TTL stored in SQLite.
- **Access Control:** All sensitive endpoints (`/api/admin/*`, `GET /api/appointments`, `PATCH /api/appointments/:id`, `GET /api/enquiries`) require a valid Bearer token.

### 2. Customer Data Protection & Status Lookup
- **Zero Public Contact Details:** Phone numbers, direct call links, and WhatsApp buttons have been removed from all customer-facing surfaces.
- **Crypto-Secure Reference IDs:** Generated via `crypto.randomBytes(4)` with format `AE-MTG-XXXX-XXXX`.
- **Dual-Factor Status Lookup:** Customers can check booking status at `POST /api/appointments/status-lookup` only by providing **both** their Booking Reference ID and registered email address.
- **Anti-Enumeration Rate Limiting:** IP-level rate limiting on status lookups (max 10 requests per 10 minutes) returning a generic `404 Not Found` if mismatch occurs, preventing attackers from probing valid reference IDs.
- **PII Masking:** Output masks customer name (e.g., `Rajesh S.`) and displays city without leaking personal phone numbers or email addresses.

### 3. Online Meeting Link Protection
- **No Client Exposure:** Meeting links are never displayed in public frontend JavaScript or rendered to unauthenticated users.
- **Delivery Via Private Email:** Google Meet links are delivered exclusively to the customer's registered email address upon administrative approval.
- **Manual or Auto Generation:** Admins can manually paste an existing Google Meet link (`https://meet.google.com/xxx-yyyy-zzz`) or use the in-portal Auto-Generate button.

### 4. HTTP Security Headers
The server automatically applies strict security headers to every response:
- `Content-Security-Policy`: Restricts scripts, styles, fonts, and connects to self and trusted CDNs (Google Fonts, Tailwind, CDNJS).
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 🏗️ System Structure

```
atharva-solar/
├── .env.example               # Template for environment variables and SMTP settings
├── .gitignore                 # Excludes .env, .env.*, and data/*.db*
├── Dockerfile                 # Containerized deployment spec
├── package.json               # Pure Node manifest (zero dependencies)
├── README.md                  # System documentation
├── render.yaml                # Render cloud deployment config
├── run.bat                    # One-click Windows launch script
├── test-upgrade.js            # End-to-end verification test suite
│
├── data/
│   └── atharva.db             # Persistent SQLite database (WAL mode, parameterized queries)
│
├── server/
│   ├── index.js               # HTTP server, security headers, routing, CORS, static serving
│   ├── db.js                  # SQLite connection, table schemas, migrations, default seeding
│   ├── auth.js                # PBKDF2 hashing, session tokens, IP rate limiter
│   ├── email.js               # Private email dispatcher (SMTP or secure simulated mode)
│   └── validators.js          # Email validation, input sanitization, secure ID generator
│
└── public/
    ├── index.html             # Upgraded single-page app (booking engine, status lookup, FAQ, legal)
    ├── css/
    │   └── style.css          # Design system, responsive grid, status lookup cards, FAQ accordion
    └── js/
        ├── app.js             # Client scheduler, status lookup, ROI calculator, FAQ toggles
        ├── admin.js           # Admin dashboard, Meet link generator, rescheduling, status controls
        ├── brands.js          # High-fidelity vector SVG brand logos
        └── icons.js           # SVG icon definitions
```

---

## ⚙️ Environment Variables (`.env`)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the HTTP server to bind to |
| `HOST` | `0.0.0.0` | Host IP address to bind to |
| `NODE_ENV` | `production` | Environment mode (`development` or `production`) |
| `ALLOWED_ORIGIN` | `https://atharvasolar.com` | Allowed CORS origin header |
| `GOOGLE_MEET_PREFIX` | `https://meet.google.com/` | Base URL prefix for meeting link generation |
| `SMTP_HOST` | `smtp.gmail.com` | Outgoing SMTP server host |
| `SMTP_PORT` | `587` | SMTP port (typically 587 or 465) |
| `SMTP_SECURE` | `false` | TLS/SSL mode for SMTP |
| `SMTP_USER` | *(empty)* | SMTP login username |
| `SMTP_PASS` | *(empty)* | SMTP application-specific password |
| `SMTP_FROM` | `"Atharva Solar" <bookings@...>` | From header on outgoing confirmation emails |

*Note: When SMTP credentials are not configured, the server operates in simulated email mode, writing the email dispatch receipt to internal server memory and logs without leaking details to public clients.*

---

## 🧪 Testing and Verification Suite

Run the comprehensive end-to-end test suite:
```powershell
& "C:\Program Files\nodejs\node.exe" test-upgrade.js
```

The test suite automatically validates:
1. Public security headers (`CSP`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`).
2. Appointment booking API (`POST /api/appointments`) with required email validation.
3. Cryptographically secure Reference ID format (`AE-MTG-XXXX-XXXX`).
4. Conflict rejection (`409 Conflict`) on double-booking the same date and slot.
5. Admin authentication with PBKDF2 hashing and session verification.
6. Rate-limiting lockout on excessive failed login attempts (5 attempts / 15 mins).
7. Unauthorized API access rejection (`401 Unauthorized`) without valid Bearer token.
8. Admin Google Meet link generation (`POST /api/admin/generate-meet`).
9. Admin booking approval (`PATCH /api/appointments/:id`) and private email dispatch.
10. Customer self-service status lookup (`POST /api/appointments/status-lookup`) requiring Reference ID + email.
11. Protection against customer enumeration (invalid email returns `404`).

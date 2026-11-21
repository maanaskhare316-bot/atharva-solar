/**
 * Atharva Enterprises - Public Client Application
 * Premium Corporate Solar Experience & Secure Online Consultation Booking
 */

(function () {
  'use strict';

  // Application State
  const state = {
    selectedDate: '',
    selectedSlot: '',
    availableSlots: [],
    brands: [],
    services: []
  };

  // Toast Notification Helper
  function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' 
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>';
    
    toast.innerHTML = `
      <div style="flex-shrink:0;">${icon}</div>
      <div style="flex-grow:1;">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  window.showToast = showToast;

  // 1. Render Available Solar Brands
  async function loadBrands() {
    const grid = document.getElementById('brands-grid');
    if (!grid) return;

    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      if (!data.success || !data.brands) return;

      state.brands = data.brands;
      grid.innerHTML = data.brands.map(b => {
        const logoSvg = window.BrandLogos && window.BrandLogos[b.name] 
          ? window.BrandLogos[b.name] 
          : `<div style="font-weight:900;font-size:1.3rem;color:var(--navy-900);">${b.name}</div>`;

        return `
          <div class="brand-card">
            <div class="brand-logo-wrap">
              ${logoSvg}
            </div>
            <span class="brand-category-tag">${b.category || 'Tier-1 PV'}</span>
            <p class="brand-desc-text">${b.tagline || b.description || 'High-efficiency photovoltaic modules and inverters.'}</p>
            <a href="#book-meeting" class="brand-consult-btn">
              Consult Availability &rarr;
            </a>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading brands:', err);
    }
  }

  // 2. Render Core Services Grid
  async function loadServices() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;

    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (!data.success || !data.services) return;

      state.services = data.services;
      grid.innerHTML = data.services.map((s) => {
        const iconKey = s.icon.toLowerCase();
        const iconSvg = window.Icons && window.Icons[iconKey] ? window.Icons[iconKey] : (window.Icons?.sun || '');

        return `
          <div class="service-card">
            <div class="service-icon-box">
              ${iconSvg}
            </div>
            <h3 class="service-title">${s.title}</h3>
            <p class="service-desc">${s.short_description}</p>
            <div>
              <a href="#book-meeting" class="service-action-link">
                <span>Book Consultation</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </a>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading services:', err);
    }
  }

  // 3. Interactive Meeting Scheduler
  async function loadSlotsForDate(dateStr) {
    const container = document.getElementById('slots-container');
    if (!container) return;

    container.innerHTML = '<div class="slot-placeholder">Checking slot availability...</div>';

    try {
      const res = await fetch(`/api/slots/available?date=${dateStr}`);
      const data = await res.json();

      if (data.isBlocked) {
        container.innerHTML = `
          <div style="padding:0.75rem;background:#FEE2E2;border-radius:6px;color:#991B1B;font-size:0.85rem;">
            ⚠️ ${data.reason || 'Not open for bookings'}
          </div>
        `;
        state.availableSlots = [];
        state.selectedSlot = '';
        return;
      }

      state.availableSlots = data.availableSlots || [];

      if (!data.allSlots || data.allSlots.length === 0) {
        container.innerHTML = '<div style="color:#EF4444;font-size:0.85rem;">No slots available for this date.</div>';
        return;
      }

      container.innerHTML = `
        <div class="slot-chips-wrap">
          ${data.allSlots.map(s => `
            <button type="button" 
              class="slot-chip ${s.isAvailable ? '' : 'disabled'} ${state.selectedSlot === s.slot ? 'selected' : ''}"
              ${s.isAvailable ? `onclick="window.selectSlot('${s.slot}')"` : 'disabled title="Slot already reserved"'}
            >
              ${s.slot}
            </button>
          `).join('')}
        </div>
      `;
    } catch (err) {
      container.innerHTML = '<div style="color:#EF4444;font-size:0.85rem;">Error checking slots. Please try again.</div>';
    }
  }

  function initScheduler() {
    const dateInput = document.getElementById('booking-date');
    if (!dateInput) return;

    // Set min date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minStr = tomorrow.toISOString().split('T')[0];
    dateInput.min = minStr;

    // Set max date to 45 days in advance
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 45);
    dateInput.max = maxDate.toISOString().split('T')[0];

    // Default to tomorrow
    dateInput.value = minStr;
    state.selectedDate = minStr;
    loadSlotsForDate(minStr);

    dateInput.addEventListener('change', (e) => {
      state.selectedDate = e.target.value;
      state.selectedSlot = '';
      loadSlotsForDate(e.target.value);
    });

    const form = document.getElementById('appointment-booking-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!state.selectedSlot) {
          showToast('Please select an available time slot', 'error');
          return;
        }

        const submitBtn = document.getElementById('booking-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting Request...';

        const payload = {
          fullName: document.getElementById('booking-name').value,
          email: document.getElementById('booking-email').value,
          city: document.getElementById('booking-city').value,
          propertyType: document.getElementById('booking-property').value,
          meetingType: document.getElementById('booking-meeting-type').value,
          appointmentDate: state.selectedDate,
          timeSlot: state.selectedSlot,
          requirements: document.getElementById('booking-requirements').value
        };

        try {
          const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            showToast(data.error || 'Failed to submit booking request', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Meeting Request';
            return;
          }

          // Show confirmation modal
          showBookingSuccessModal(data);
          form.reset();
          state.selectedSlot = '';
          loadSlotsForDate(state.selectedDate);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Meeting Request';
        } catch (err) {
          showToast('Network error while scheduling. Please try again.', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Meeting Request';
        }
      });
    }
  }

  window.selectSlot = function (slot) {
    state.selectedSlot = slot;
    document.querySelectorAll('.slot-chip').forEach(el => {
      if (el.textContent.trim() === slot) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  };

  // Booking Confirmation Modal
  function showBookingSuccessModal(data) {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    const booking = data.booking;
    content.innerHTML = `
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="width:58px;height:58px;border-radius:50%;background:rgba(22,132,91,0.12);color:#16845B;display:inline-flex;align-items:center;justify-content:center;margin-bottom:1rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:1.5rem;font-weight:800;color:#0B1628;margin-bottom:0.5rem;">Meeting Request Submitted!</h3>
        <p style="color:#64748B;font-size:0.9rem;">Reference ID: <strong style="color:#0B1628;font-family:monospace;font-size:1.05rem;">${data.referenceNo}</strong></p>
      </div>

      <div style="background:#F3F5F7;border-radius:8px;padding:1.25rem;border:1px solid #E2E8F0;margin-bottom:1.25rem;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.875rem;">
          <div><strong style="color:#64748B;">Client Name:</strong><br>${booking.fullName}</div>
          <div><strong style="color:#64748B;">Registered Email:</strong><br>${booking.email}</div>
          <div><strong style="color:#64748B;">Requested Date:</strong><br>${booking.appointmentDate}</div>
          <div><strong style="color:#64748B;">Selected Slot:</strong><br>${booking.timeSlot}</div>
          <div><strong style="color:#64748B;">Consultation Subject:</strong><br>${booking.meetingType}</div>
          <div><strong style="color:#64748B;">Initial Status:</strong><br><span style="display:inline-block;padding:0.2rem 0.5rem;background:#FEF3C7;color:#92400E;border-radius:4px;font-size:0.75rem;font-weight:700;">Under Review</span></div>
        </div>
      </div>

      <div class="privacy-notice-box" style="margin-bottom:1.5rem;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="notice-icon"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>An acknowledgment has been sent to <strong>${booking.email}</strong>. Once our engineering team approves the slot, your private Google Meet video room link will be sent to your inbox.</span>
      </div>

      <div style="display:flex;gap:0.75rem;">
        <button class="btn btn-secondary" onclick="window.closeModal()" style="flex:1;">Close</button>
        <button class="btn btn-primary" onclick="window.closeModal(); window.scrollToLookup('${data.referenceNo}', '${booking.email}')" style="flex:1;">
          Track Status
        </button>
      </div>
    `;

    modal.style.display = 'flex';
  }

  // 4. Modal Controls
  window.closeModal = function () {
    const modal = document.getElementById('generic-modal');
    if (modal) modal.style.display = 'none';
  };

  // 5. Customer Booking Status Lookup (Dual Factor: Ref ID + Registered Email)
  window.handleStatusLookup = async function (e) {
    if (e) e.preventDefault();
    const ref = (document.getElementById('lookup-ref')?.value || '').trim();
    const email = (document.getElementById('lookup-email')?.value || '').trim();
    const resultBox = document.getElementById('status-result-container');

    if (!ref || !email) {
      showToast('Please enter both your Reference ID and registered email', 'error');
      return;
    }

    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="padding:1rem;color:#64748B;font-size:0.875rem;">Verifying booking credentials...</div>';

    try {
      const res = await fetch('/api/appointments/status-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceNo: ref, email: email })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        resultBox.innerHTML = `
          <div style="border:1px solid #FCA5A5;background:#FEF2F2;border-radius:8px;padding:1.25rem;">
            <div style="color:#B91C1C;font-weight:700;margin-bottom:0.25rem;">Verification Failed</div>
            <div style="font-size:0.875rem;color:#7F1D1D;">${data.error || 'No booking found matching the provided details.'}</div>
          </div>
        `;
        return;
      }

      const isConfirmed = data.status === 'confirmed';

      resultBox.innerHTML = `
        <div style="background:#F3F5F7;border:1px solid #E2E8F0;border-radius:10px;padding:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
            <div>
              <span style="font-size:0.75rem;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;font-weight:700;">Reference ID</span>
              <div style="font-size:1.15rem;font-weight:800;color:#0B1628;font-family:monospace;">${data.referenceNo}</div>
            </div>
            <span style="display:inline-block;padding:0.3rem 0.75rem;border-radius:9999px;font-size:0.8rem;font-weight:700;text-transform:uppercase;${
              isConfirmed ? 'background:#DCFCE7;color:#166534;' : 'background:#FEF3C7;color:#92400E;'
            }">
              ${data.status}
            </span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.85rem;font-size:0.875rem;margin-bottom:1rem;">
            <div><strong style="color:#64748B;">Client Name:</strong><br>${data.maskedName || 'Verified Client'}</div>
            <div><strong style="color:#64748B;">Consultation:</strong><br>${data.meetingType}</div>
            <div><strong style="color:#64748B;">Confirmed Date:</strong><br>📅 ${data.appointmentDate}</div>
            <div><strong style="color:#64748B;">Time Slot:</strong><br>⏰ ${data.timeSlot}</div>
          </div>

          <div style="font-size:0.85rem;color:#0B1628;background:#FFFFFF;padding:0.85rem 1rem;border-radius:8px;border:1px solid #E2E8F0;margin-bottom:1rem;">
            ℹ️ ${data.meetingNotice}
          </div>

          ${isConfirmed && data.privateMeetingUrl ? `
            <div style="background:#0B1628;color:#FFFFFF;padding:1rem 1.25rem;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
              <div>
                <strong style="color:#FFFFFF;display:block;">Google Meet Video Room</strong>
                <span style="font-size:0.8rem;color:#94A3B8;">Private room assigned for your technical consultation</span>
              </div>
              <a href="${data.privateMeetingUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                Join Online Meeting &rarr;
              </a>
            </div>
          ` : ''}
        </div>
      `;
    } catch (err) {
      resultBox.innerHTML = '<div style="color:#EF4444;font-size:0.85rem;padding:1rem;">Network error. Please try again.</div>';
    }
  };

  window.scrollToLookup = function (ref = '', email = '') {
    const section = document.getElementById('track-booking');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
    if (ref && document.getElementById('lookup-ref')) {
      document.getElementById('lookup-ref').value = ref;
    }
    if (email && document.getElementById('lookup-email')) {
      document.getElementById('lookup-email').value = email;
    }
  };

  // 6. FAQ Accordion Toggle
  window.toggleFaq = function (btnEl) {
    const parentItem = btnEl.closest('.faq-item');
    if (!parentItem) return;

    const isActive = parentItem.classList.contains('active');

    // Close all FAQs first
    document.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));

    // Open target if not already active
    if (!isActive) {
      parentItem.classList.add('active');
    }
  };

  // 7. Privacy & Terms Modals
  window.openPrivacyModal = function (e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="margin-bottom:1.25rem;">
        <span class="badge-tag badge-gold">Confidentiality & Privacy</span>
        <h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:1.4rem;font-weight:800;color:#0B1628;margin-bottom:0.35rem;">Privacy Policy</h3>
        <p style="color:#64748B;font-size:0.8rem;">Last Updated: November 2026</p>
      </div>

      <div style="max-height:360px;overflow-y:auto;padding-right:0.5rem;font-size:0.85rem;color:#475569;line-height:1.65;">
        <h4 style="color:#0B1628;margin:0.75rem 0 0.25rem;">1. Data Collection Scope</h4>
        <p>Atharva Enterprises collects only information strictly necessary to conduct technical solar consultations: customer name, verified email address, city/location, and optional technical project requirements.</p>

        <h4 style="color:#0B1628;margin:0.75rem 0 0.25rem;">2. Use of Information</h4>
        <p>Email addresses are utilized solely to dispatch consultation confirmation receipts, schedule Google Meet invitations, and coordinate project proposals.</p>

        <h4 style="color:#0B1628;margin:0.75rem 0 0.25rem;">3. Zero Commercial Telemarketing</h4>
        <p>We do not collect personal mobile numbers for public marketing, and we never share customer records with external lead aggregators or advertisers.</p>

        <h4 style="color:#0B1628;margin:0.75rem 0 0.25rem;">4. Retention & Deletion</h4>
        <p>Records are retained in accordance with PWD electrical contracting audit requirements. Customers may request deletion of records at any time by contacting our engineering office.</p>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:1.5rem;">
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
      </div>
    `;

    modal.style.display = 'flex';
  };

  window.openTermsModal = function (e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="margin-bottom:1.25rem;">
        <span class="badge-tag badge-gold">Terms of Service</span>
        <h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:1.4rem;font-weight:800;color:#0B1628;margin-bottom:0.35rem;">Consultation Terms</h3>
      </div>

      <div style="max-height:360px;overflow-y:auto;padding-right:0.5rem;font-size:0.85rem;color:#475569;line-height:1.65;">
        <p><strong>1. Technical Feasibility Advisory:</strong> Online consultations and sizing recommendations are provided for initial engineering guidance. Official turnkey contracting is formalized following comprehensive physical structural assessment.</p>
        <p style="margin-top:0.75rem;"><strong>2. Component Availability:</strong> Mention of specific Tier-1 solar brands is subject to market supply, manufacturer warranty specifications, and project electrical design.</p>
        <p style="margin-top:0.75rem;"><strong>3. Punctuality & Cancellation:</strong> Please join your assigned Google Meet link at the scheduled time. If you need to reschedule, submit a new booking slot through our portal at least 4 hours in advance.</p>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:1.5rem;">
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
      </div>
    `;

    modal.style.display = 'flex';
  };

  window.openSecurityModal = function (e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="margin-bottom:1.25rem;">
        <span class="badge-tag badge-gold">Cybersecurity Architecture</span>
        <h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:1.4rem;font-weight:800;color:#0B1628;margin-bottom:0.35rem;">Security & Data Protection</h3>
      </div>

      <div style="font-size:0.85rem;color:#475569;line-height:1.65;">
        <ul style="list-style:none;display:flex;flex-direction:column;gap:0.75rem;">
          <li>🔒 <strong>Private Link Transmission:</strong> Google Meet room links are dispatched privately to verified emails upon slot approval and never rendered to unauthenticated users.</li>
          <li>🛡️ <strong>Anti-Enumeration Protection:</strong> Status lookups require dual verification (exact Reference ID + matching registered email) to prevent unauthorized inspection.</li>
          <li>⚡ <strong>PBKDF2 Password Hashing:</strong> Administrative credentials protected using PBKDF2 with SHA-512, 100,000 rounds, and cryptographic salts.</li>
          <li>🛡️ <strong>Application Hardening:</strong> Strict Content Security Policy, X-Frame-Options clickjacking mitigation, and fully parameterized SQL operations.</li>
        </ul>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:1.5rem;">
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
      </div>
    `;

    modal.style.display = 'flex';
  };

  // 8. Mobile Menu Toggle
  function initMobileMenu() {
    const toggleBtn = document.getElementById('mobile-toggle-btn');
    const drawer = document.getElementById('mobile-nav-drawer');
    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener('click', () => {
      drawer.classList.toggle('open');
    });

    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
      });
    });
  }

  // 9. Anonymous Visitor Traffic Tracker
  function trackVisitor() {
    try {
      let vid = localStorage.getItem('ae_visitor_id');
      if (!vid) {
        vid = 'v_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        localStorage.setItem('ae_visitor_id', vid);
      }
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: vid,
          pagePath: window.location.pathname + window.location.hash,
          referrer: document.referrer || 'Direct'
        })
      }).catch(() => {});
    } catch {
      // Non-blocking
    }
  }

  // Document Ready
  document.addEventListener('DOMContentLoaded', () => {
    trackVisitor();
    loadBrands();
    loadServices();
    initScheduler();
    initMobileMenu();
  });

})();

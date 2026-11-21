/**
 * Atharva Enterprises - Public Client Application
 * Premium Interactive Solar Business Experience & Secure Meeting Booking
 */

(function () {
  'use strict';

  // Application State
  const state = {
    selectedDate: '',
    selectedSlot: '',
    availableSlots: [],
    monthlyBill: 4500,
    brands: [],
    services: [],
    settings: {}
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
    const icon = type === 'success' ? window.Icons.checkCircle2 : window.Icons.shieldCheck;
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

  // 1. Subsidy Countdown Timer (Target: 31 March 2027 23:59:59 IST)
  function initSubsidyCountdown() {
    const targetDate = new Date('2027-03-31T23:59:59+05:30').getTime();

    function update() {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        const wrap = document.getElementById('countdown-wrapper');
        if (wrap) wrap.innerHTML = '<div style="font-weight:700;color:#EF4444;">Scheme timeline under review</div>';
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const daysEl = document.getElementById('cd-days');
      const hoursEl = document.getElementById('cd-hours');
      const minsEl = document.getElementById('cd-mins');
      const secsEl = document.getElementById('cd-secs');

      if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minsEl) minsEl.textContent = String(minutes).padStart(2, '0');
      if (secsEl) secsEl.textContent = String(seconds).padStart(2, '0');
    }

    update();
    setInterval(update, 1000);
  }

  // 2. Solar Calculator Slider Logic
  function initCalculator() {
    const slider = document.getElementById('calc-bill-range');
    const display = document.getElementById('calc-bill-display');
    if (!slider || !display) return;

    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      display.textContent = `₹${val.toLocaleString('en-IN')}`;
      recalculatePlan(val);
    });

    recalculatePlan(4500);
  }

  async function recalculatePlan(bill) {
    try {
      const res = await fetch('/api/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBill: bill })
      });
      const data = await res.json();
      if (!data.success || !data.result) return;

      const r = data.result;
      const elCap = document.getElementById('res-capacity');
      const elSub = document.getElementById('res-subsidy');
      const elNet = document.getElementById('res-net-cost');
      const elSav = document.getElementById('res-annual-savings');
      const elPay = document.getElementById('res-payback');
      const elRoof = document.getElementById('res-roof');

      if (elCap) elCap.textContent = `${r.recommendedCapacityKw.toFixed(1)} kW`;
      if (elSub) elSub.textContent = `₹${r.subsidyAmount.toLocaleString('en-IN')}`;
      if (elNet) elNet.textContent = `₹${r.netEstimatedCost.toLocaleString('en-IN')}`;
      if (elSav) elSav.textContent = `₹${r.annualSavings.toLocaleString('en-IN')}/yr`;
      if (elPay) elPay.textContent = `~${r.paybackPeriodYears} Years`;
      if (elRoof) elRoof.textContent = `~${r.roofAreaSqFt} Sq.Ft`;
    } catch (err) {
      console.error('Error recalculating plan:', err);
    }
  }

  // 3. Render Brands Grid
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
          : `<div style="font-weight:900;font-size:1.6rem;color:var(--navy-900);">${b.name}</div>`;

        const specsHtml = (b.features || []).map(f => `
          <li class="brand-spec-item">
            ${window.Icons.check}
            <span>${f}</span>
          </li>
        `).join('');

        return `
          <div class="brand-card">
            <div>
              <div class="brand-card-header">
                ${logoSvg}
              </div>
              <div class="brand-card-top-row">
                <span class="brand-category-badge">${b.category}</span>
                <span class="brand-verified-pill">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  MNRE / ALMM Listed
                </span>
              </div>
              <h3 class="brand-name">${b.name}</h3>
              <p class="brand-tagline">${b.tagline || ''}</p>
              <p class="brand-desc">${b.description || ''}</p>
              <ul class="brand-specs-list">
                ${specsHtml}
              </ul>
            </div>
            <a href="#schedule" class="btn btn-secondary btn-sm" style="width:100%;margin-top:1rem;justify-content:center;">
              📅 Schedule Consultation
            </a>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading brands:', err);
    }
  }

  // 4. Render Services Grid
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
        const iconSvg = window.Icons[iconKey] || window.Icons.sun;

        return `
          <div class="service-card">
            <div class="service-icon-box">
              ${iconSvg}
            </div>
            <h3 class="service-card-title">${s.title}</h3>
            <p class="service-card-desc">${s.short_description}</p>
            <div class="service-card-actions">
              <button class="btn btn-secondary btn-sm" onclick="window.openServiceModal('${s.slug}')">
                Learn More
              </button>
              <a href="#schedule" class="btn btn-primary btn-sm">
                Book Consultation
              </a>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading services:', err);
    }
  }

  // 5. Interactive Meeting Scheduler
  async function loadSlotsForDate(dateStr) {
    const container = document.getElementById('slots-container');
    if (!container) return;

    container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;">Checking slot availability...</div>';

    try {
      const res = await fetch(`/api/slots/available?date=${dateStr}`);
      const data = await res.json();

      if (data.isBlocked) {
        container.innerHTML = `
          <div style="padding:0.75rem;background:#FEE2E2;border-radius:6px;color:#991B1B;font-size:0.85rem;">
            ${window.Icons.shieldCheck} ${data.reason}
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
          showToast('Please select a preferred meeting time slot', 'error');
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Scheduling...';

        const payload = {
          fullName: document.getElementById('booking-name').value,
          email: document.getElementById('booking-email').value,
          city: document.getElementById('booking-city').value,
          propertyType: document.getElementById('booking-property').value,
          meetingType: document.getElementById('booking-meeting-type').value,
          appointmentDate: state.selectedDate,
          timeSlot: state.selectedSlot,
          billRange: document.getElementById('booking-bill-range').value,
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
            showToast(data.error || 'Failed to submit appointment request', 'error');
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
        <div style="width:64px;height:64px;border-radius:50%;background:var(--solar-green-light);color:var(--solar-green);display:inline-flex;align-items:center;justify-content:center;margin-bottom:1rem;">
          ${window.Icons.checkCircle2}
        </div>
        <h3 style="font-size:1.6rem;font-weight:800;color:#FFFFFF;margin-bottom:0.5rem;">Meeting Request Submitted!</h3>
        <p style="color:var(--text-muted);font-size:0.95rem;">Reference ID: <strong style="color:var(--solar-cyan);font-family:monospace;font-size:1.1rem;">${data.referenceNo}</strong></p>
      </div>

      <div style="background:var(--bg-card-elevated);border-radius:var(--radius-md);padding:1.25rem;border:1px solid var(--border-color);margin-bottom:1.25rem;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.875rem;">
          <div><strong style="color:var(--text-muted);">Name:</strong><br>${booking.fullName}</div>
          <div><strong style="color:var(--text-muted);">Registered Email:</strong><br>${booking.email}</div>
          <div><strong style="color:var(--text-muted);">Date:</strong><br>${booking.appointmentDate}</div>
          <div><strong style="color:var(--text-muted);">Slot:</strong><br>${booking.timeSlot}</div>
          <div><strong style="color:var(--text-muted);">Consultation:</strong><br>${booking.meetingType}</div>
          <div><strong style="color:var(--text-muted);">Status:</strong><br><span class="status-badge pending">Under Review</span></div>
        </div>
      </div>

      <div class="privacy-notice-box" style="margin-bottom:1.5rem;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <span>An acknowledgment has been sent to <strong>${booking.email}</strong>. Once our engineering team approves the slot, your private Google Meet video room link will be sent to your inbox.</span>
      </div>

      <div style="display:flex;gap:0.75rem;">
        <button class="btn btn-secondary" onclick="window.closeModal()" style="flex:1;">Close</button>
        <button class="btn btn-primary" onclick="window.closeModal(); window.scrollToLookup('${data.referenceNo}', '${booking.email}')" style="flex:1;">
          Track Status
        </button>
      </div>
    `;

    modal.classList.add('active');
  }

  // 6. Generic Modal Controls
  window.closeModal = function () {
    const modal = document.getElementById('generic-modal');
    if (modal) modal.classList.remove('active');
  };

  window.openServiceModal = function (slug) {
    const service = state.services.find(s => s.slug === slug);
    if (!service) return;

    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    const benefitsHtml = (service.benefits || []).map(b => `
      <li style="display:flex;align-items:flex-start;gap:0.6rem;margin-bottom:0.65rem;font-size:0.925rem;color:var(--text-main);">
        <span style="color:var(--solar-green);margin-top:2px;">${window.Icons.check}</span>
        <span>${b}</span>
      </li>
    `).join('');

    content.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <span class="badge-tag badge-blue">Service Detail</span>
        <h3 style="font-size:1.6rem;font-weight:800;color:var(--navy-900);margin-bottom:0.5rem;">${service.title}</h3>
        <p style="color:var(--text-muted);font-size:0.95rem;line-height:1.6;">${service.full_description}</p>
      </div>

      <div style="background:var(--navy-50);border-radius:var(--radius-md);padding:1.25rem;border:1px solid var(--border-color);margin-bottom:1.5rem;">
        <h4 style="font-size:0.95rem;font-weight:700;color:var(--navy-900);margin-bottom:0.75rem;">Key Engineering Scope & Deliverables</h4>
        <ul style="list-style:none;">${benefitsHtml}</ul>
      </div>

      <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
        <a href="#schedule" class="btn btn-primary" onclick="window.closeModal()">
          Book Online Consultation
        </a>
      </div>
    `;

    modal.classList.add('active');
  };

  // 7. General Online Enquiry Form
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        type: 'general_enquiry',
        name: document.getElementById('contact-name').value,
        email: document.getElementById('contact-email').value,
        serviceInterest: document.getElementById('contact-service').value,
        message: document.getElementById('contact-message').value
      };

      try {
        const res = await fetch('/api/enquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          form.reset();
          showToast(`Message received securely! Ref: ${data.referenceNo}. Our team will respond via email.`, 'success');
        } else {
          showToast(data.error || 'Could not send message', 'error');
        }
      } catch (err) {
        showToast('Network error. Please try again.', 'error');
      }
    });
  }

  // 8. Customer Booking Status Lookup
  window.handleStatusLookup = async function (e) {
    if (e) e.preventDefault();
    const ref = (document.getElementById('lookup-ref-input')?.value || '').trim();
    const email = (document.getElementById('lookup-email-input')?.value || '').trim();
    const resultBox = document.getElementById('booking-lookup-result');

    if (!ref || !email) {
      showToast('Please enter both your Reference ID and registered email', 'error');
      return;
    }

    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="padding:1rem;color:var(--text-muted);font-size:0.875rem;">Verifying booking credentials...</div>';

    try {
      const res = await fetch('/api/appointments/status-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceNo: ref, email: email })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        resultBox.innerHTML = `
          <div class="status-result-card" style="border-color:#EF4444;background:rgba(239,68,68,0.1);">
            <div style="color:#F87171;font-weight:700;margin-bottom:0.25rem;">Verification Failed</div>
            <div style="font-size:0.875rem;color:#CBD5E1;">${data.error || 'No booking found matching the provided details.'}</div>
          </div>
        `;
        return;
      }

      const isConfirmed = data.status === 'confirmed';

      resultBox.innerHTML = `
        <div class="status-result-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
            <div>
              <span style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;">Reference ID</span>
              <div style="font-size:1.2rem;font-weight:900;color:#FFFFFF;font-family:monospace;">${data.referenceNo}</div>
            </div>
            <span class="status-badge-lg ${data.status}">
              ${data.status}
            </span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.875rem;margin-bottom:1rem;">
            <div><strong style="color:var(--text-muted);">Customer:</strong><br>${data.customerName}</div>
            <div><strong style="color:var(--text-muted);">Meeting Type:</strong><br>${data.meetingType}</div>
            <div><strong style="color:var(--text-muted);">Confirmed Date:</strong><br>📅 ${data.appointmentDate}</div>
            <div><strong style="color:var(--text-muted);">Time Slot:</strong><br>⏰ ${data.timeSlot}</div>
          </div>

          <div style="font-size:0.85rem;color:#38BDF8;background:rgba(56,189,248,0.1);padding:0.75rem 1rem;border-radius:8px;border:1px solid rgba(56,189,248,0.25);">
            ℹ️ ${data.meetingNotice}
          </div>

          ${isConfirmed && data.privateMeetingUrl ? `
            <div class="meeting-link-box">
              <div>
                <strong style="color:#FFFFFF;display:block;margin-bottom:0.25rem;">Google Meet Private Room</strong>
                <span style="font-size:0.8rem;color:#94A3B8;">Camera & microphone recommended</span>
              </div>
              <a href="${data.privateMeetingUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                Join Online Meeting →
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
    if (ref && document.getElementById('lookup-ref-input')) {
      document.getElementById('lookup-ref-input').value = ref;
    }
    if (email && document.getElementById('lookup-email-input')) {
      document.getElementById('lookup-email-input').value = email;
    }
  };

  // 9. FAQ Accordion Toggle
  window.toggleFaq = function (btnEl) {
    const answer = btnEl.nextElementSibling;
    const isActive = btnEl.classList.contains('active');

    // Close all FAQs first
    document.querySelectorAll('.faq-question').forEach(q => q.classList.remove('active'));
    document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));

    // Open target if not already active
    if (!isActive) {
      btnEl.classList.add('active');
      answer.classList.add('open');
    }
  };

  // 10. Privacy & Legal Modals
  window.openPrivacyModal = function () {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <span class="badge-tag badge-blue">Data Protection & Confidentiality</span>
        <h3 style="font-size:1.6rem;font-weight:800;color:var(--navy-900);margin-bottom:0.5rem;">Privacy Policy</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;">Last Updated: November 2026</p>
      </div>

      <div style="max-height:360px;overflow-y:auto;padding-right:0.5rem;font-size:0.875rem;color:var(--text-main);line-height:1.7;">
        <h4 style="color:var(--navy-900);margin:0.75rem 0 0.25rem;">1. Information We Collect</h4>
        <p>Atharva Enterprises collects only information strictly required to coordinate and schedule your solar engineering consultations: your full name, email address, city/location, and optional details regarding your monthly power bill or roof space.</p>

        <h4 style="color:var(--navy-900);margin:0.75rem 0 0.25rem;">2. Purpose of Processing</h4>
        <p>We process your data exclusively to verify consultation requests, assign qualified electrical engineers, and privately transmit your Google Meet room link.</p>

        <h4 style="color:var(--navy-900);margin:0.75rem 0 0.25rem;">3. Zero Commercial Disclosure</h4>
        <p>We never sell, rent, or distribute your email or personal information to third-party telemarketers, lead aggregators, or external advertisers.</p>

        <h4 style="color:var(--navy-900);margin:0.75rem 0 0.25rem;">4. Data Retention & Deletion</h4>
        <p>Consultation records are stored securely for 2 years for statutory compliance under PWD contracting audit guidelines. You may request deletion of your records anytime via our online enquiry portal.</p>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:1.5rem;">
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
      </div>
    `;

    modal.classList.add('active');
  };

  window.openTermsModal = function () {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <span class="badge-tag badge-green">Terms of Service</span>
        <h3 style="font-size:1.6rem;font-weight:800;color:var(--navy-900);margin-bottom:0.5rem;">Consultation Terms</h3>
      </div>

      <div style="max-height:360px;overflow-y:auto;padding-right:0.5rem;font-size:0.875rem;color:var(--text-main);line-height:1.7;">
        <p><strong>1. Non-Binding Guidance:</strong> Online solar consultations and estimated savings provided through our portal are for technical advisory purposes. Official turnkey contracts are formalized after physical site verification.</p>
        <p style="margin-top:0.75rem;"><strong>2. Subsidy Approval:</strong> Central subsidy under PM Surya Ghar Muft Bijli Yojana is administered by national and DISCOM authorities. Atharva Enterprises assists with documentation but final grant is governed by government regulations.</p>
        <p style="margin-top:0.75rem;"><strong>3. Attendance & Rescheduling:</strong> Please join your scheduled Google Meet room on time. If you need to reschedule, notify us via our enquiry portal at least 4 hours in advance.</p>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:1.5rem;">
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
      </div>
    `;

    modal.classList.add('active');
  };

  window.openSecurityModal = function () {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <span class="badge-tag badge-blue">Infrastructure Security</span>
        <h3 style="font-size:1.6rem;font-weight:800;color:var(--navy-900);margin-bottom:0.5rem;">Security Architecture</h3>
      </div>

      <div style="font-size:0.875rem;color:var(--text-main);line-height:1.7;">
        <ul style="list-style:none;display:flex;flex-direction:column;gap:0.75rem;">
          <li>🛡️ <strong>Password Hashing:</strong> Administrative credentials protected using PBKDF2 with SHA-512 and cryptographic salts.</li>
          <li>🔒 <strong>Private Link Transmission:</strong> Online meeting rooms are assigned exclusively to verified applicants and never listed publicly.</li>
          <li>⚡ <strong>Anti-Enumeration Protection:</strong> Booking status lookups require matching Reference ID and exact registered email with rate-limit defense.</li>
          <li>🛡️ <strong>Defense in Depth:</strong> Strict Content Security Policy, XSS filtering, parameterized SQLite queries, and atomic double-booking prevention.</li>
        </ul>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:1.5rem;">
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
      </div>
    `;

    modal.classList.add('active');
  };

  // 11. Mobile Menu Toggle
  function initMobileMenu() {
    const toggleBtn = document.getElementById('mobile-toggle-btn');
    const drawer = document.getElementById('mobile-nav-drawer');
    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener('click', () => {
      drawer.classList.toggle('active');
    });

    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('active');
      });
    });
  }

  // 12. Anonymous Visitor Traffic Tracker
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
    initSubsidyCountdown();
    initCalculator();
    loadBrands();
    loadServices();
    initScheduler();
    initContactForm();
    initMobileMenu();
  });

})();

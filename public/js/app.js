/**
 * Atharva Enterprises - Public Client Application
 * Premium Interactive Solar Business Experience
 */

(function () {
  'use strict';

  // State
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

  // 2. Solar Calculator & Subsidy Logic
  function calculateSolar(monthlyBill) {
    const bill = parseFloat(monthlyBill) || 3000;
    const unitsPerMonth = bill / 7.5; // MP average ₹7.5/unit
    let kw = (unitsPerMonth / 30) / 4; // 1kW generates ~4 units/day
    kw = Math.max(1, Math.round(kw * 2) / 2);

    const roofSqFt = Math.round(kw * 95);

    // PM Surya Ghar Subsidy Caps
    let subsidy = 0;
    if (kw >= 3) {
      subsidy = 78000;
    } else if (kw >= 2) {
      subsidy = 60000;
    } else if (kw >= 1) {
      subsidy = 30000;
    }

    const grossCost = Math.round(kw * 60000);
    const netCost = Math.max(0, grossCost - subsidy);
    const annualSavings = Math.round(kw * 4 * 365 * 7.5);
    const lifetimeSavings = Math.round((annualSavings * 25) - netCost);

    return {
      bill,
      kw,
      roofSqFt,
      subsidy,
      grossCost,
      netCost,
      annualSavings,
      lifetimeSavings
    };
  }

  function initCalculator() {
    const slider = document.getElementById('calc-bill-slider');
    const billDisplay = document.getElementById('calc-bill-display');

    if (!slider) return;

    function renderCalc() {
      const bill = parseInt(slider.value, 10);
      if (billDisplay) billDisplay.textContent = `₹${bill.toLocaleString('en-IN')}`;

      const res = calculateSolar(bill);

      const capEl = document.getElementById('res-capacity');
      const roofEl = document.getElementById('res-roof');
      const subEl = document.getElementById('res-subsidy');
      const netEl = document.getElementById('res-net-cost');
      const savEl = document.getElementById('res-annual-savings');
      const lifeEl = document.getElementById('res-lifetime-savings');

      if (capEl) capEl.textContent = `${res.kw} kW`;
      if (roofEl) roofEl.textContent = `${res.roofSqFt} sq. ft.`;
      if (subEl) subEl.textContent = `₹${res.subsidy.toLocaleString('en-IN')}`;
      if (netEl) netEl.textContent = `₹${res.netCost.toLocaleString('en-IN')}`;
      if (savEl) savEl.textContent = `₹${res.annualSavings.toLocaleString('en-IN')} / yr`;
      if (lifeEl) lifeEl.textContent = `₹${res.lifetimeSavings.toLocaleString('en-IN')}`;
    }

    slider.addEventListener('input', renderCalc);
    renderCalc();
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
            <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:1rem;" onclick="window.openBrandInquiry('${b.name}')">
              ${window.Icons.messageSquare} Inquire Available Stock
            </button>
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
      grid.innerHTML = data.services.map((s, idx) => {
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
              <button class="btn btn-primary btn-sm" onclick="window.openQuoteModal('${s.title}')">
                Get a Quote
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading services:', err);
    }
  }

  // 5. Interactive Meeting & Site Visit Scheduler
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
          showToast('Please select a preferred time slot', 'error');
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Scheduling...';

        const payload = {
          fullName: document.getElementById('booking-name').value,
          phone: document.getElementById('booking-phone').value,
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
            showToast(data.error || 'Failed to book appointment', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Solar Consultation';
            return;
          }

          // Show confirmation modal
          showBookingSuccessModal(data);
          form.reset();
          state.selectedSlot = '';
          loadSlotsForDate(state.selectedDate);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm Solar Consultation';
        } catch (err) {
          showToast('Network error while scheduling. Please try again.', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm Solar Consultation';
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

    const apt = data.appointment;
    content.innerHTML = `
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--solar-green-light);color:var(--solar-green);display:inline-flex;align-items:center;justify-content:center;margin-bottom:1rem;">
          ${window.Icons.checkCircle2}
        </div>
        <h3 style="font-size:1.6rem;font-weight:800;color:var(--navy-900);margin-bottom:0.5rem;">Appointment Scheduled!</h3>
        <p style="color:var(--text-muted);font-size:0.95rem;">Reference Number: <strong style="color:var(--navy-900);">${data.referenceNo}</strong></p>
      </div>

      <div style="background:var(--navy-50);border-radius:var(--radius-md);padding:1.25rem;border:1px solid var(--border-color);margin-bottom:1.5rem;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.875rem;">
          <div><strong style="color:var(--text-muted);">Name:</strong><br>${apt.fullName}</div>
          <div><strong style="color:var(--text-muted);">City:</strong><br>${apt.city}</div>
          <div><strong style="color:var(--text-muted);">Date:</strong><br>${apt.appointmentDate}</div>
          <div><strong style="color:var(--text-muted);">Slot:</strong><br>${apt.timeSlot}</div>
          <div><strong style="color:var(--text-muted);">Type:</strong><br>${apt.meetingType.replace('_', ' ').toUpperCase()}</div>
          <div><strong style="color:var(--text-muted);">Status:</strong><br><span class="status-badge pending">Pending Confirmation</span></div>
        </div>
      </div>

      <p style="font-size:0.875rem;color:var(--text-muted);line-height:1.5;margin-bottom:1.5rem;text-align:center;">
        Our technical survey engineer from Atharva Enterprises will call you at <strong>${apt.phone}</strong> to confirm site survey specifics.
      </p>

      <div style="display:flex;flex-direction:column;gap:0.75rem;">
        <a href="${data.whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp" style="width:100%;">
          ${window.Icons.whatsapp} Open WhatsApp Confirmation
        </a>
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
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
        <button class="btn btn-primary" onclick="window.closeModal(); window.openQuoteModal('${service.title}')">
          Get a Quote for this Service
        </button>
      </div>
    `;

    modal.classList.add('active');
  };

  window.openBrandInquiry = function (brandName) {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <span class="badge-tag badge-amber">Product Availability</span>
        <h3 style="font-size:1.6rem;font-weight:800;color:var(--navy-900);margin-bottom:0.35rem;">Inquire About ${brandName}</h3>
        <p style="color:var(--text-muted);font-size:0.9rem;">Check stock availability, module wattages (DCR/Non-DCR), and bulk supply pricing.</p>
      </div>

      <form id="brand-inquiry-form" onsubmit="window.handleBrandInquirySubmit(event, '${brandName}')">
        <div style="display:grid;grid-template-columns:1fr;gap:1rem;margin-bottom:1.5rem;">
          <div class="form-group">
            <label class="form-label">Full Name <span class="required">*</span></label>
            <input type="text" id="bi-name" class="form-input" required placeholder="e.g. Ramesh Kumar">
          </div>
          <div class="form-group">
            <label class="form-label">Mobile Number <span class="required">*</span></label>
            <input type="tel" id="bi-phone" class="form-input" required placeholder="10-digit mobile number">
          </div>
          <div class="form-group">
            <label class="form-label">City / Location</label>
            <input type="text" id="bi-city" class="form-input" placeholder="e.g. Bhopal, Indore">
          </div>
          <div class="form-group">
            <label class="form-label">Requirement Details</label>
            <textarea id="bi-message" class="form-textarea" rows="3" placeholder="Approx kW capacity, residential or commercial application"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-amber">Submit Availability Request</button>
        </div>
      </form>
    `;

    modal.classList.add('active');
  };

  window.handleBrandInquirySubmit = async function (e, brandName) {
    e.preventDefault();
    const payload = {
      type: 'brand_inquiry',
      name: document.getElementById('bi-name').value,
      phone: document.getElementById('bi-phone').value,
      city: document.getElementById('bi-city').value,
      brandInterest: brandName,
      message: document.getElementById('bi-message').value
    };

    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.closeModal();
        showToast(`Request for ${brandName} received! Ref: ${data.referenceNo}`, 'success');
        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, '_blank');
        }
      } else {
        showToast(data.error || 'Failed to submit enquiry', 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  window.openQuoteModal = function (serviceName = '') {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <span class="badge-tag badge-green">Free Quotation</span>
        <h3 style="font-size:1.6rem;font-weight:800;color:var(--navy-900);margin-bottom:0.35rem;">Request a Solar Quotation</h3>
        <p style="color:var(--text-muted);font-size:0.9rem;">Receive an engineered proposal tailored to your roof and power requirements.</p>
      </div>

      <form id="quote-req-form" onsubmit="window.handleQuoteSubmit(event, '${serviceName}')">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
          <div class="form-group">
            <label class="form-label">Full Name <span class="required">*</span></label>
            <input type="text" id="qr-name" class="form-input" required placeholder="e.g. Anand Sharma">
          </div>
          <div class="form-group">
            <label class="form-label">Mobile Number <span class="required">*</span></label>
            <input type="tel" id="qr-phone" class="form-input" required placeholder="10-digit mobile number">
          </div>
          <div class="form-group">
            <label class="form-label">City / Town</label>
            <input type="text" id="qr-city" class="form-input" placeholder="e.g. Jabalpur, Gwalior">
          </div>
          <div class="form-group">
            <label class="form-label">Property Type</label>
            <select id="qr-property" class="form-select">
              <option value="residential">Residential Home</option>
              <option value="commercial">Commercial Building</option>
              <option value="industrial">Industrial Plant</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Avg. Monthly Bill (₹)</label>
            <input type="number" id="qr-bill" class="form-input" placeholder="e.g. 5000">
          </div>
          <div class="form-group">
            <label class="form-label">Service Interested</label>
            <input type="text" id="qr-service" class="form-input" value="${serviceName || 'Residential Solar Installation'}">
          </div>
        </div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Request Quotation</button>
        </div>
      </form>
    `;

    modal.classList.add('active');
  };

  window.handleQuoteSubmit = async function (e, defaultService) {
    e.preventDefault();
    const payload = {
      type: 'quote',
      name: document.getElementById('qr-name').value,
      phone: document.getElementById('qr-phone').value,
      city: document.getElementById('qr-city').value,
      propertyType: document.getElementById('qr-property').value,
      monthlyBill: document.getElementById('qr-bill').value,
      serviceInterest: document.getElementById('qr-service').value || defaultService
    };

    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.closeModal();
        showToast(`Quotation request received! Ref: ${data.referenceNo}`, 'success');
        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, '_blank');
        }
      } else {
        showToast(data.error || 'Failed to submit quote request', 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  // 7. General Contact Form
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        type: 'general_contact',
        name: document.getElementById('contact-name').value,
        phone: document.getElementById('contact-phone').value,
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
          showToast(`Message received! Ref: ${data.referenceNo}. We will call you soon.`, 'success');
        } else {
          showToast(data.error || 'Could not send message', 'error');
        }
      } catch (err) {
        showToast('Network error. Please try again.', 'error');
      }
    });
  }

  // 8. Subsidy Eligibility Form
  function initSubsidyForm() {
    const form = document.getElementById('subsidy-eligibility-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        type: 'subsidy_check',
        name: document.getElementById('sub-name').value,
        phone: document.getElementById('sub-phone').value,
        state: document.getElementById('sub-state').value,
        propertyType: document.getElementById('sub-property').value,
        monthlyBill: document.getElementById('sub-bill').value,
        solarCapacityKw: document.getElementById('sub-capacity').value
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
          showToast(`Subsidy eligibility enquiry logged! Ref: ${data.referenceNo}`, 'success');
          if (data.whatsappUrl) {
            window.open(data.whatsappUrl, '_blank');
          }
        } else {
          showToast(data.error || 'Submission failed', 'error');
        }
      } catch (err) {
        showToast('Network error. Please try again.', 'error');
      }
    });
  }

  // 9. Appointment Lookup
  window.openLookupModal = function () {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <span class="badge-tag badge-blue">Self Service</span>
        <h3 style="font-size:1.6rem;font-weight:800;color:var(--navy-900);margin-bottom:0.35rem;">Track Scheduled Appointment</h3>
        <p style="color:var(--text-muted);font-size:0.9rem;">Enter your booking reference number and mobile number to view status.</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:1rem;margin-bottom:1.5rem;">
        <div class="form-group">
          <label class="form-label">Booking Reference Number <span class="required">*</span></label>
          <input type="text" id="lookup-ref" class="form-input" placeholder="e.g. AE-APT-1001">
        </div>
        <div class="form-group">
          <label class="form-label">Registered Phone Number</label>
          <input type="tel" id="lookup-phone" class="form-input" placeholder="e.g. 9827034567">
        </div>
        <button class="btn btn-primary" onclick="window.executeAppointmentLookup()">Check Status</button>
      </div>

      <div id="lookup-result-area"></div>

      <div style="display:flex;justify-content:flex-end;margin-top:1.5rem;">
        <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
      </div>
    `;

    modal.classList.add('active');
  };

  window.executeAppointmentLookup = async function () {
    const ref = document.getElementById('lookup-ref').value;
    const phone = document.getElementById('lookup-phone').value;
    const resultArea = document.getElementById('lookup-result-area');

    if (!ref) {
      showToast('Please enter reference number', 'error');
      return;
    }

    resultArea.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;">Searching booking records...</div>';

    try {
      const res = await fetch(`/api/appointments/lookup?ref=${encodeURIComponent(ref)}&phone=${encodeURIComponent(phone)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.appointment) {
        resultArea.innerHTML = `<div style="padding:0.75rem;background:#FEE2E2;color:#991B1B;border-radius:6px;font-size:0.85rem;">${data.error || 'No appointment found with this reference number.'}</div>`;
        return;
      }

      const a = data.appointment;
      resultArea.innerHTML = `
        <div style="background:var(--navy-50);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1.25rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
            <strong style="color:var(--navy-900);font-size:1.1rem;">${a.reference_no}</strong>
            <span class="status-badge ${a.status}">${a.status}</span>
          </div>
          <div style="font-size:0.875rem;display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;color:var(--text-main);">
            <div><strong>Client:</strong> ${a.full_name}</div>
            <div><strong>City:</strong> ${a.city}</div>
            <div><strong>Date:</strong> ${a.appointment_date}</div>
            <div><strong>Slot:</strong> ${a.time_slot}</div>
            <div><strong>Meeting:</strong> ${a.meeting_type.replace('_', ' ').toUpperCase()}</div>
          </div>
        </div>
      `;
    } catch (err) {
      resultArea.innerHTML = '<div style="color:#EF4444;font-size:0.85rem;">Error fetching booking details.</div>';
    }
  };

  // 10. Mobile Menu Toggle
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

  // 11. Anonymous Visitor Traffic Tracker (Feeds Admin Analytics)
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
    } catch (e) {
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
    initSubsidyForm();
    initMobileMenu();
  });

})();

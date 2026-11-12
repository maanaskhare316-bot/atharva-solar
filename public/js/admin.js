/**
 * Atharva Enterprises - Admin Dashboard Controller
 * Lead Management, Appointment Approvals, Brand CMS, Slot Blocking & Analytics
 */

(function () {
  'use strict';

  const adminState = {
    token: localStorage.getItem('atharva_admin_token') || '',
    user: null,
    currentTab: 'leads',
    stats: {},
    leads: [],
    appointments: [],
    blockedSlots: [],
    brands: []
  };

  // Helper for authenticated fetch
  async function adminFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (adminState.token) {
      options.headers['Authorization'] = `Bearer ${adminState.token}`;
    }
    const res = await fetch(url, options);
    if (res.status === 401) {
      adminLogout();
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  }

  // Check auth on load
  async function checkAuth() {
    if (!adminState.token) {
      showLoginModal();
      return false;
    }

    try {
      const res = await adminFetch('/api/admin/me');
      const data = await res.json();
      if (data.authenticated) {
        adminState.user = data.user;
        renderAdminUI();
        return true;
      }
    } catch (err) {
      // not authenticated
    }
    showLoginModal();
    return false;
  }

  function showLoginModal() {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="width:52px;height:52px;border-radius:12px;background:var(--navy-900);color:var(--solar-amber);display:inline-flex;align-items:center;justify-content:center;margin-bottom:0.75rem;">
          ${window.Icons.shieldCheck}
        </div>
        <h3 style="font-size:1.5rem;font-weight:800;color:var(--navy-900);margin-bottom:0.35rem;">Atharva Admin Portal</h3>
        <p style="color:var(--text-muted);font-size:0.875rem;">Secure management of customer leads, visits & site content</p>
      </div>

      <form id="admin-login-form" onsubmit="window.handleAdminLogin(event)">
        <div class="form-group" style="margin-bottom:1rem;">
          <label class="form-label">Admin Email</label>
          <input type="email" id="login-email" class="form-input" required value="admin@atharvasolar.com">
        </div>
        <div class="form-group" style="margin-bottom:1.5rem;">
          <label class="form-label">Password</label>
          <input type="password" id="login-password" class="form-input" required value="Atharva@2026">
        </div>
        <button type="submit" class="btn btn-navy" style="width:100%;">
          Sign In to Admin Dashboard
        </button>
      </form>
      <div style="margin-top:1rem;text-align:center;font-size:0.75rem;color:var(--text-muted);">
        Default Credentials: <code>admin@atharvasolar.com</code> / <code>Atharva@2026</code>
      </div>
    `;

    modal.classList.add('active');
  }

  window.handleAdminLogin = async function (e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        adminState.token = data.token;
        adminState.user = data.user;
        localStorage.setItem('atharva_admin_token', data.token);
        window.closeModal();
        window.showToast('Welcome, Administrator!', 'success');
        renderAdminUI();
      } else {
        window.showToast(data.error || 'Authentication failed', 'error');
      }
    } catch (err) {
      window.showToast('Login error. Please check server.', 'error');
    }
  };

  window.adminLogout = function () {
    localStorage.removeItem('atharva_admin_token');
    adminState.token = '';
    adminState.user = null;
    document.getElementById('admin-view-wrap').style.display = 'none';
    document.getElementById('public-view-wrap').style.display = 'block';
    window.location.hash = '';
    window.showToast('Logged out successfully', 'info');
  };

  // Render UI and load tabs
  async function renderAdminUI() {
    document.getElementById('public-view-wrap').style.display = 'none';
    const adminWrap = document.getElementById('admin-view-wrap');
    adminWrap.style.display = 'block';

    await loadStats();
    switchTab(adminState.currentTab);
  }

  async function loadStats() {
    try {
      const res = await adminFetch('/api/admin/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        adminState.stats = data.stats;
        document.getElementById('kpi-total-enquiries').textContent = data.stats.totalEnquiries;
        document.getElementById('kpi-new-enquiries').textContent = data.stats.newEnquiries;
        document.getElementById('kpi-total-appointments').textContent = data.stats.totalAppointments;
        document.getElementById('kpi-confirmed-appointments').textContent = data.stats.confirmedAppointments;
        document.getElementById('kpi-pending-appointments').textContent = data.stats.pendingAppointments;
      }
    } catch (err) {
      console.error(err);
    }
  }

  function switchTab(tab) {
    adminState.currentTab = tab;
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
      if (b.dataset.tab === tab) b.classList.add('active');
      else b.classList.remove('active');
    });

    const pane = document.getElementById('admin-tab-content');
    if (tab === 'leads') renderLeadsTab(pane);
    else if (tab === 'appointments') renderAppointmentsTab(pane);
    else if (tab === 'brands') renderBrandsTab(pane);
    else if (tab === 'settings') renderSettingsTab(pane);
  }

  window.switchAdminTab = switchTab;

  // TAB 1: Leads & Enquiries
  async function renderLeadsTab(container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.5rem;font-weight:800;color:var(--navy-900);">Customer Enquiries & Solar Leads</h2>
          <p style="font-size:0.875rem;color:var(--text-muted);">Real-time leads from quote requests, subsidy checks and brand inquiries</p>
        </div>
        <div style="display:flex;gap:0.75rem;">
          <a href="/api/enquiries/export" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;gap:0.4rem;">
            ${window.Icons.download} Export CSV
          </a>
          <button class="btn btn-primary btn-sm" onclick="window.refreshLeads()">
            Refresh
          </button>
        </div>
      </div>

      <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        <input type="text" id="lead-search" class="form-input" style="max-width:300px;" placeholder="Search name, phone, city, ref..." oninput="window.filterLeads()">
        <select id="lead-type-filter" class="form-select" style="max-width:200px;" onchange="window.filterLeads()">
          <option value="all">All Enquiry Types</option>
          <option value="quote">Quotation Requests</option>
          <option value="subsidy_check">Subsidy Eligibility</option>
          <option value="brand_inquiry">Brand Inquiries</option>
          <option value="general_contact">General Contact</option>
        </select>
        <select id="lead-status-filter" class="form-select" style="max-width:180px;" onchange="window.filterLeads()">
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in_review">In Review</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div id="leads-table-wrap" class="admin-table-container">
        <div style="padding:2rem;text-align:center;color:var(--text-muted);">Loading enquiries...</div>
      </div>
    `;

    await loadAndDisplayLeads();
  }

  async function loadAndDisplayLeads() {
    try {
      const res = await adminFetch('/api/enquiries');
      const data = await res.json();
      if (data.success && data.enquiries) {
        adminState.leads = data.enquiries;
        renderLeadsTable(adminState.leads);
      }
    } catch (err) {
      console.error(err);
    }
  }

  window.refreshLeads = loadAndDisplayLeads;

  function renderLeadsTable(leads) {
    const wrap = document.getElementById('leads-table-wrap');
    if (!wrap) return;

    if (leads.length === 0) {
      wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);">No enquiries found.</div>';
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Ref No / Date</th>
            <th>Customer</th>
            <th>Type</th>
            <th>Details (Bill / Capacity)</th>
            <th>Status</th>
            <th>Notes</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(lead => `
            <tr>
              <td>
                <strong>${lead.reference_no}</strong><br>
                <span style="font-size:0.75rem;color:var(--text-muted);">${new Date(lead.created_at).toLocaleDateString('en-IN')}</span>
              </td>
              <td>
                <strong>${lead.name}</strong><br>
                <span style="font-size:0.8rem;color:var(--text-muted);">${lead.phone}</span><br>
                <span style="font-size:0.75rem;color:var(--solar-green);">${lead.city || 'MP'}</span>
              </td>
              <td>
                <span class="badge-tag badge-blue" style="font-size:0.7rem;margin:0;">${(lead.type || '').replace('_', ' ')}</span>
                ${lead.brand_interest ? `<br><small style="color:var(--solar-amber);font-weight:700;">${lead.brand_interest}</small>` : ''}
              </td>
              <td>
                ${lead.monthly_bill ? `Bill: <strong>₹${lead.monthly_bill}</strong><br>` : ''}
                ${lead.solar_capacity_kw ? `Cap: <strong>${lead.solar_capacity_kw} kW</strong><br>` : ''}
                <span style="font-size:0.75rem;color:var(--text-muted);">${lead.property_type || ''}</span>
              </td>
              <td>
                <select class="form-select" style="font-size:0.8rem;padding:0.35rem 0.5rem;" onchange="window.updateLeadStatus(${lead.id}, this.value)">
                  <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New</option>
                  <option value="in_review" ${lead.status === 'in_review' ? 'selected' : ''}>In Review</option>
                  <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                  <option value="converted" ${lead.status === 'converted' ? 'selected' : ''}>Converted</option>
                  <option value="closed" ${lead.status === 'closed' ? 'selected' : ''}>Closed</option>
                </select>
              </td>
              <td style="max-width:180px;">
                <span style="font-size:0.8rem;color:var(--text-muted);">${lead.notes || 'None'}</span>
              </td>
              <td>
                <div style="display:flex;gap:0.4rem;">
                  <button class="btn btn-secondary btn-sm" onclick="window.editLeadNotes(${lead.id}, '${(lead.notes || '').replace(/'/g, "\\'")}')">
                    Notes
                  </button>
                  <a href="https://wa.me/${lead.phone.replace(/\\D/g, '')}" target="_blank" class="btn btn-whatsapp btn-sm" title="Contact on WhatsApp">
                    WA
                  </a>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  window.filterLeads = function () {
    const search = (document.getElementById('lead-search').value || '').toLowerCase();
    const type = document.getElementById('lead-type-filter').value;
    const status = document.getElementById('lead-status-filter').value;

    const filtered = adminState.leads.filter(l => {
      const matchSearch = !search || 
        l.name.toLowerCase().includes(search) || 
        l.phone.includes(search) || 
        (l.city && l.city.toLowerCase().includes(search)) ||
        l.reference_no.toLowerCase().includes(search);
      const matchType = type === 'all' || l.type === type;
      const matchStatus = status === 'all' || l.status === status;
      return matchSearch && matchType && matchStatus;
    });

    renderLeadsTable(filtered);
  };

  window.updateLeadStatus = async function (id, status) {
    try {
      const res = await adminFetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        window.showToast('Lead status updated', 'success');
        loadStats();
      }
    } catch (err) {
      window.showToast('Failed to update status', 'error');
    }
  };

  window.editLeadNotes = function (id, currentNotes) {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <h3 style="font-size:1.4rem;font-weight:800;color:var(--navy-900);margin-bottom:1rem;">Internal Notes for Lead</h3>
      <textarea id="lead-note-text" class="form-textarea" rows="4" style="margin-bottom:1.5rem;">${currentNotes}</textarea>
      <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
        <button class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="window.saveLeadNote(${id})">Save Notes</button>
      </div>
    `;

    modal.classList.add('active');
  };

  window.saveLeadNote = async function (id) {
    const notes = document.getElementById('lead-note-text').value;
    try {
      const res = await adminFetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (res.ok) {
        window.closeModal();
        window.showToast('Notes saved', 'success');
        loadAndDisplayLeads();
      }
    } catch (err) {
      window.showToast('Failed to save notes', 'error');
    }
  };

  // TAB 2: Appointments & Visits
  async function renderAppointmentsTab(container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.5rem;font-weight:800;color:var(--navy-900);">Scheduled Site Visits & Consultations</h2>
          <p style="font-size:0.875rem;color:var(--text-muted);">Confirm customer visits, assign survey technicians, and manage schedule</p>
        </div>
        <div style="display:flex;gap:0.75rem;">
          <button class="btn btn-amber btn-sm" onclick="window.openBlockDateModal()">
            ${window.Icons.calendar} Block Date / Slot
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.loadAndDisplayAppointments()">
            Refresh
          </button>
        </div>
      </div>

      <div id="appointments-table-wrap" class="admin-table-container">
        <div style="padding:2rem;text-align:center;color:var(--text-muted);">Loading appointments...</div>
      </div>
    `;

    await loadAndDisplayAppointments();
  }

  async function loadAndDisplayAppointments() {
    try {
      const res = await adminFetch('/api/appointments');
      const data = await res.json();
      if (data.success && data.appointments) {
        adminState.appointments = data.appointments;
        renderAppointmentsTable(data.appointments);
      }
    } catch (err) {
      console.error(err);
    }
  }

  window.loadAndDisplayAppointments = loadAndDisplayAppointments;

  function renderAppointmentsTable(apts) {
    const wrap = document.getElementById('appointments-table-wrap');
    if (!wrap) return;

    if (apts.length === 0) {
      wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);">No appointments booked yet.</div>';
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Ref No / Date</th>
            <th>Time Slot</th>
            <th>Customer & City</th>
            <th>Visit Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${apts.map(a => `
            <tr>
              <td>
                <strong>${a.reference_no}</strong><br>
                <span style="font-weight:600;color:var(--navy-900);">${a.appointment_date}</span>
              </td>
              <td>
                <span class="badge-tag badge-blue" style="font-size:0.75rem;margin:0;">${a.time_slot}</span>
              </td>
              <td>
                <strong>${a.full_name}</strong><br>
                <span style="font-size:0.8rem;color:var(--text-muted);">${a.phone}</span><br>
                <span style="font-size:0.75rem;color:var(--solar-green);">${a.city} (${a.property_type})</span>
              </td>
              <td>
                <span style="font-weight:600;font-size:0.8rem;">${a.meeting_type.replace('_', ' ').toUpperCase()}</span>
                ${a.requirements ? `<br><small style="color:var(--text-muted);">${a.requirements.slice(0, 45)}...</small>` : ''}
              </td>
              <td>
                <select class="form-select" style="font-size:0.8rem;padding:0.35rem 0.5rem;" onchange="window.updateAppointmentStatus(${a.id}, this.value)">
                  <option value="pending" ${a.status === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="confirmed" ${a.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                  <option value="completed" ${a.status === 'completed' ? 'selected' : ''}>Completed</option>
                  <option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                  <option value="rejected" ${a.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                </select>
              </td>
              <td>
                <div style="display:flex;gap:0.4rem;">
                  <a href="tel:${a.phone.replace(/\\s/g, '')}" class="btn btn-secondary btn-sm" title="Call">
                    ${window.Icons.phone}
                  </a>
                  <a href="https://wa.me/${a.phone.replace(/\\D/g, '')}?text=Hello%20${encodeURIComponent(a.full_name)},%20Atharva%20Enterprises%20regarding%20your%20site%20visit%20appointment%20${a.reference_no}." target="_blank" class="btn btn-whatsapp btn-sm" title="WhatsApp">
                    WA
                  </a>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  window.updateAppointmentStatus = async function (id, status) {
    try {
      const res = await adminFetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        window.showToast('Appointment status updated', 'success');
        loadStats();
      }
    } catch (err) {
      window.showToast('Failed to update appointment', 'error');
    }
  };

  window.openBlockDateModal = function () {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    content.innerHTML = `
      <h3 style="font-size:1.4rem;font-weight:800;color:var(--navy-900);margin-bottom:0.5rem;">Block Date or Time Slot</h3>
      <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1.5rem;">Prevent customers from selecting specific dates for site visits</p>

      <form id="block-slot-form" onsubmit="window.handleBlockSlotSubmit(event)">
        <div class="form-group" style="margin-bottom:1rem;">
          <label class="form-label">Date to Block <span class="required">*</span></label>
          <input type="date" id="block-date" class="form-input" required min="${minDate}">
        </div>
        <div class="form-group" style="margin-bottom:1rem;">
          <label class="form-label">Specific Time Slot (Optional)</label>
          <select id="block-slot" class="form-select">
            <option value="">Block Entire Day</option>
            <option value="10:00 AM - 11:30 AM">10:00 AM - 11:30 AM</option>
            <option value="11:30 AM - 01:00 PM">11:30 AM - 01:00 PM</option>
            <option value="02:00 PM - 03:30 PM">02:00 PM - 03:30 PM</option>
            <option value="03:30 PM - 05:00 PM">03:30 PM - 05:00 PM</option>
            <option value="05:00 PM - 06:30 PM">05:00 PM - 06:30 PM</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:1.5rem;">
          <label class="form-label">Reason</label>
          <input type="text" id="block-reason" class="form-input" placeholder="e.g. Public Holiday, Team Survey Day">
        </div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-amber">Block Date</button>
        </div>
      </form>
    `;

    modal.classList.add('active');
  };

  window.handleBlockSlotSubmit = async function (e) {
    e.preventDefault();
    const payload = {
      blockDate: document.getElementById('block-date').value,
      timeSlot: document.getElementById('block-slot').value || null,
      reason: document.getElementById('block-reason').value
    };

    try {
      const res = await adminFetch('/api/blocked-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        window.closeModal();
        window.showToast('Slot blocked successfully', 'success');
      }
    } catch (err) {
      window.showToast('Failed to block date', 'error');
    }
  };

  // TAB 3: Solar Brand Management
  async function renderBrandsTab(container) {
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      const brands = data.brands || [];

      container.innerHTML = `
        <div style="margin-bottom:1.5rem;">
          <h2 style="font-size:1.5rem;font-weight:800;color:var(--navy-900);">Available Solar Brands Management</h2>
          <p style="font-size:0.875rem;color:var(--text-muted);">Toggle brand product availability and highlight key offerings</p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:1.25rem;">
          ${brands.map(b => `
            <div style="background:#FFF;border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow-sm);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                <h4 style="font-weight:800;color:var(--navy-900);font-size:1.15rem;">${b.name}</h4>
                <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;cursor:pointer;">
                  <input type="checkbox" ${b.available ? 'checked' : ''} onchange="window.toggleBrandAvailability(${b.id}, this.checked)">
                  <span>Available</span>
                </label>
              </div>
              <p style="font-size:0.85rem;color:var(--solar-green);margin-bottom:0.75rem;">${b.tagline || ''}</p>
              <div style="font-size:0.75rem;color:var(--text-muted);">${(b.features || []).join(' • ')}</div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      container.innerHTML = '<div style="color:#EF4444;">Error loading brands.</div>';
    }
  }

  window.toggleBrandAvailability = async function (brandId, isAvailable) {
    try {
      const res = await adminFetch(`/api/brands/${brandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: isAvailable })
      });
      if (res.ok) {
        window.showToast('Brand status updated', 'success');
      }
    } catch (err) {
      window.showToast('Failed to update brand status', 'error');
    }
  };

  // TAB 4: Website CMS & Settings
  async function renderSettingsTab(container) {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      const s = data.settings || {};

      container.innerHTML = `
        <div style="margin-bottom:1.5rem;">
          <h2 style="font-size:1.5rem;font-weight:800;color:var(--navy-900);">Website Settings & Business Content CMS</h2>
          <p style="font-size:0.875rem;color:var(--text-muted);">Update helpline contacts, subsidy deadline and PWD registration notes without touching code</p>
        </div>

        <form id="settings-cms-form" onsubmit="window.saveSettingsCMS(event)" style="background:#FFF;border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:2rem;max-width:800px;">
          <div class="form-group" style="margin-bottom:1.25rem;">
            <label class="form-label">Company Name</label>
            <input type="text" id="set-company-name" class="form-input" value="${s.company_name || 'Atharva Enterprises'}">
          </div>
          <div class="form-group" style="margin-bottom:1.25rem;">
            <label class="form-label">Tagline</label>
            <input type="text" id="set-tagline" class="form-input" value="${s.tagline || 'Powering Your Future with Clean Solar Energy.'}">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem;">
            <div class="form-group">
              <label class="form-label">Contact Phone</label>
              <input type="text" id="set-phone" class="form-input" value="${s.phone || '+91 90390 05531'}">
            </div>
            <div class="form-group">
              <label class="form-label">WhatsApp Number</label>
              <input type="text" id="set-whatsapp" class="form-input" value="${s.whatsapp || '+91 90390 05531'}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem;">
            <div class="form-group">
              <label class="form-label">Subsidy Offer Deadline</label>
              <input type="date" id="set-deadline" class="form-input" value="${s.subsidy_deadline || '2027-03-31'}">
            </div>
            <div class="form-group">
              <label class="form-label">Max Subsidy Amount (₹)</label>
              <input type="number" id="set-subsidy-max" class="form-input" value="${s.subsidy_max_amount || '78000'}">
            </div>
          </div>
          <div class="form-group" style="margin-bottom:1.25rem;">
            <label class="form-label">Office Address / Coverage Area</label>
            <textarea id="set-address" class="form-textarea" rows="2">${s.office_address || 'Serving Bhopal, Indore, Jabalpur, Gwalior, Ujjain & throughout Madhya Pradesh'}</textarea>
          </div>
          <div class="form-group" style="margin-bottom:1.5rem;">
            <label class="form-label">A Class Electrical & PWD Contractor Note</label>
            <textarea id="set-pwd" class="form-textarea" rows="2">${s.pwd_license_info || 'Registered A Class Electrical & PWD Contractor with Government of Madhya Pradesh.'}</textarea>
          </div>
          <button type="submit" class="btn btn-primary">
            Save All Settings
          </button>
        </form>
      `;
    } catch (err) {
      container.innerHTML = '<div style="color:#EF4444;">Error loading settings.</div>';
    }
  }

  window.saveSettingsCMS = async function (e) {
    e.preventDefault();
    const payload = {
      company_name: document.getElementById('set-company-name').value,
      tagline: document.getElementById('set-tagline').value,
      phone: document.getElementById('set-phone').value,
      whatsapp: document.getElementById('set-whatsapp').value,
      subsidy_deadline: document.getElementById('set-deadline').value,
      subsidy_max_amount: document.getElementById('set-subsidy-max').value,
      office_address: document.getElementById('set-address').value,
      pwd_license_info: document.getElementById('set-pwd').value
    };

    try {
      const res = await adminFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        window.showToast('Settings saved successfully', 'success');
      }
    } catch (err) {
      window.showToast('Failed to save settings', 'error');
    }
  };

  // Route listener: Check if hash is #admin
  function handleRoute() {
    if (window.location.hash === '#admin') {
      checkAuth();
    } else {
      document.getElementById('admin-view-wrap').style.display = 'none';
      document.getElementById('public-view-wrap').style.display = 'block';
    }
  }

  window.addEventListener('hashchange', handleRoute);
  document.addEventListener('DOMContentLoaded', handleRoute);

})();

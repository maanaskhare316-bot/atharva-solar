/**
 * Atharva Enterprises - Admin Dashboard Controller
 * Lead Management, Appointment Approvals, Brand CMS, Slot Blocking & Analytics
 */

(function () {
  'use strict';

  const adminState = {
    token: localStorage.getItem('atharva_admin_token') || '',
    user: null,
    currentTab: 'analytics',
    stats: {},
    analytics: {},
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
        <div style="width:52px;height:52px;border-radius:12px;background:#0F1D33;color:#38BDF8;display:inline-flex;align-items:center;justify-content:center;margin-bottom:0.75rem;box-shadow:0 4px 12px rgba(2,132,199,0.3);">
          ${window.Icons.shieldCheck}
        </div>
        <h3 style="font-size:1.5rem;font-weight:800;color:var(--navy-900);margin-bottom:0.35rem;">Atharva Admin Portal</h3>
        <p style="color:var(--text-muted);font-size:0.875rem;">Authorized Administrator Access Only</p>
      </div>

      <form id="admin-login-form" onsubmit="window.handleAdminLogin(event)">
        <div class="form-group" style="margin-bottom:1.15rem;">
          <label class="form-label">Admin Email</label>
          <input type="email" id="login-email" class="form-input" required placeholder="Enter admin email" autocomplete="username">
        </div>
        <div class="form-group" style="margin-bottom:1.5rem;">
          <label class="form-label">Password</label>
          <input type="password" id="login-password" class="form-input" required placeholder="Enter password" autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">
          Sign In to Admin Dashboard
        </button>
      </form>
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
        window.showToast(data.error || 'Invalid email or password', 'error');
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
      const [statsRes, analyticsRes] = await Promise.all([
        adminFetch('/api/admin/stats').then(r => r.json()).catch(() => ({})),
        adminFetch('/api/admin/analytics').then(r => r.json()).catch(() => ({}))
      ]);

      if (statsRes && statsRes.stats) {
        adminState.stats = statsRes.stats;
        const elEnq = document.getElementById('kpi-total-enquiries');
        if (elEnq) elEnq.textContent = statsRes.stats.totalEnquiries || 0;
        const elAppt = document.getElementById('kpi-total-appointments');
        if (elAppt) elAppt.textContent = statsRes.stats.totalAppointments || 0;
      }

      if (analyticsRes && analyticsRes.analytics) {
        adminState.analytics = analyticsRes.analytics;
        const a = analyticsRes.analytics;
        const elUniq = document.getElementById('kpi-unique-visitors');
        if (elUniq) elUniq.textContent = a.uniqueVisitors || 0;
        const elToday = document.getElementById('kpi-today-visitors');
        if (elToday) elToday.textContent = a.todayUnique || 0;
        const elViews = document.getElementById('kpi-total-views');
        if (elViews) elViews.textContent = a.totalViews || 0;
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
    if (tab === 'analytics') renderAnalyticsTab(pane);
    else if (tab === 'appointments') renderAppointmentsTab(pane);
    else if (tab === 'leads') renderLeadsTab(pane);
    else if (tab === 'brands') renderBrandsTab(pane);
    else if (tab === 'security') renderSecurityTab(pane);
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

  // TAB 0: Website Traffic & Live Visitor Analytics
  async function renderAnalyticsTab(container) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);">
        <div style="display:inline-block;margin-bottom:0.75rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
        </div>
        <div>Loading visitor traffic & analytics...</div>
      </div>
    `;

    try {
      const res = await adminFetch('/api/admin/analytics');
      const data = await res.json();
      const a = data.analytics || {};

      // Device calculations
      const devices = a.devices || [];
      let totalDev = 0;
      let mobileCount = 0;
      let desktopCount = 0;
      let tabletCount = 0;
      devices.forEach(d => {
        totalDev += d.count;
        if (d.device_type === 'Mobile') mobileCount = d.count;
        else if (d.device_type === 'Desktop') desktopCount = d.count;
        else if (d.device_type === 'Tablet') tabletCount = d.count;
      });

      const mobilePct = totalDev > 0 ? Math.round((mobileCount / totalDev) * 100) : 0;
      const desktopPct = totalDev > 0 ? Math.round((desktopCount / totalDev) * 100) : 0;
      const tabletPct = totalDev > 0 ? Math.round((tabletCount / totalDev) * 100) : 0;

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
          <div>
            <h2 style="font-size:1.5rem;font-weight:800;color:var(--navy-900);">Website Traffic & Visitor Analytics</h2>
            <p style="font-size:0.875rem;color:var(--text-muted);">Live tracking of visitors, pageviews, and visitor device usage (Admin Only)</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.refreshAnalyticsTab()" style="display:inline-flex;align-items:center;gap:0.4rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
            Refresh Live Traffic
          </button>
        </div>

        <!-- 4 Detailed Visitor Metrics -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:1rem;margin-bottom:1.75rem;">
          <div style="background:#FFFFFF;padding:1.25rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);">
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.35rem;">Total Page Views (Hits)</div>
            <div style="font-size:2rem;font-weight:900;color:var(--navy-900);">${a.totalViews || 0}</div>
            <div style="font-size:0.75rem;color:#0284C7;margin-top:0.25rem;">Total times site was opened</div>
          </div>
          <div style="background:#FFFFFF;padding:1.25rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);">
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.35rem;">Total Unique Visitors</div>
            <div style="font-size:2rem;font-weight:900;color:#0284C7;">${a.uniqueVisitors || 0}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">Distinct potential clients</div>
          </div>
          <div style="background:#FFFFFF;padding:1.25rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);">
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.35rem;">Today's Page Views</div>
            <div style="font-size:2rem;font-weight:900;color:var(--solar-green);">${a.todayViews || 0}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">Hits today</div>
          </div>
          <div style="background:#FFFFFF;padding:1.25rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);">
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.35rem;">Today's Unique Visitors</div>
            <div style="font-size:2rem;font-weight:900;color:var(--solar-amber);">${a.todayUnique || 0}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">New active visitors today</div>
          </div>
        </div>

        <!-- Device Breakdown Card -->
        <div style="background:#FFFFFF;padding:1.5rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);margin-bottom:1.75rem;">
          <h3 style="font-size:1.1rem;font-weight:800;color:var(--navy-900);margin-bottom:1rem;">Visitor Device Breakdown</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:1.25rem;">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.4rem;">
                <span>📱 Mobile Phones</span>
                <strong>${mobilePct}% (${mobileCount})</strong>
              </div>
              <div style="height:8px;background:#E2E8F0;border-radius:4px;overflow:hidden;">
                <div style="width:${mobilePct}%;height:100%;background:var(--solar-green);border-radius:4px;"></div>
              </div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.4rem;">
                <span>💻 Desktops & Laptops</span>
                <strong>${desktopPct}% (${desktopCount})</strong>
              </div>
              <div style="height:8px;background:#E2E8F0;border-radius:4px;overflow:hidden;">
                <div style="width:${desktopPct}%;height:100%;background:#0284C7;border-radius:4px;"></div>
              </div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.4rem;">
                <span>📟 Tablets</span>
                <strong>${tabletPct}% (${tabletCount})</strong>
              </div>
              <div style="height:8px;background:#E2E8F0;border-radius:4px;overflow:hidden;">
                <div style="width:${tabletPct}%;height:100%;background:var(--solar-amber);border-radius:4px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Visitor Log Table -->
        <div style="background:#FFFFFF;padding:1.5rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
            <h3 style="font-size:1.1rem;font-weight:800;color:var(--navy-900);">Recent Live Visitors Log</h3>
            <span style="font-size:0.8rem;color:var(--text-muted);">Latest 25 recorded visits</span>
          </div>
          
          <div style="overflow-x:auto;">
            <table class="admin-table" style="width:100%;">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Device</th>
                  <th>Page Visited</th>
                  <th>Referrer Source</th>
                  <th>Visitor ID</th>
                </tr>
              </thead>
              <tbody>
                ${(a.recentVisits && a.recentVisits.length > 0) ? a.recentVisits.map(v => `
                  <tr>
                    <td style="white-space:nowrap;font-size:0.85rem;color:var(--navy-900);font-weight:600;">
                      ${new Date(v.visited_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td>
                      <span class="badge ${v.device_type === 'Mobile' ? 'badge-green' : v.device_type === 'Tablet' ? 'badge-amber' : 'badge-blue'}">
                        ${v.device_type === 'Mobile' ? '📱 Mobile' : v.device_type === 'Tablet' ? '📟 Tablet' : '💻 Desktop'}
                      </span>
                    </td>
                    <td style="font-size:0.85rem;color:#0284C7;font-family:monospace;">
                      ${v.page_path || '/'}
                    </td>
                    <td style="font-size:0.85rem;color:var(--text-muted);">
                      ${v.referrer || 'Direct'}
                    </td>
                    <td style="font-size:0.75rem;font-family:monospace;color:#94A3B8;">
                      ${(v.visitor_id || '').substring(0, 10)}...
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">
                      No visitor traffic recorded yet. Once users visit the website, their data will appear live here!
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div style="color:#EF4444;padding:2rem;">Error loading visitor analytics: ${err.message}</div>`;
    }
  }

  window.refreshAnalyticsTab = function () {
    const pane = document.getElementById('admin-tab-content');
    renderAnalyticsTab(pane);
    loadStats();
  };

  // TAB 4: Admin Password & Security
  function renderSecurityTab(container) {
    container.innerHTML = `
      <div style="max-width:550px;">
        <div style="margin-bottom:1.5rem;">
          <h2 style="font-size:1.5rem;font-weight:800;color:var(--navy-900);">Admin Password & Security</h2>
          <p style="font-size:0.875rem;color:var(--text-muted);">Set your own secret password so no unauthorized person can access the portal</p>
        </div>

        <div style="background:#FFFFFF;padding:1.75rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);">
          <form id="change-password-form" onsubmit="window.handleChangePassword(event)">
            <div class="form-group" style="margin-bottom:1.25rem;">
              <label class="form-label">Current Password</label>
              <input type="password" id="cp-current" class="form-input" required placeholder="Enter current admin password">
            </div>

            <div class="form-group" style="margin-bottom:1.25rem;">
              <label class="form-label">New Secret Password (min 6 characters)</label>
              <input type="password" id="cp-new" class="form-input" required minlength="6" placeholder="Enter new secret password">
            </div>

            <div class="form-group" style="margin-bottom:1.5rem;">
              <label class="form-label">Confirm New Password</label>
              <input type="password" id="cp-confirm" class="form-input" required minlength="6" placeholder="Re-type new secret password">
            </div>

            <button type="submit" class="btn btn-primary" style="display:inline-flex;align-items:center;gap:0.5rem;">
              Update Password
            </button>
          </form>
        </div>
      </div>
    `;
  }

  window.handleChangePassword = async function (e) {
    e.preventDefault();
    const oldPassword = document.getElementById('cp-current').value;
    const newPassword = document.getElementById('cp-new').value;
    const confirmPassword = document.getElementById('cp-confirm').value;

    if (newPassword !== confirmPassword) {
      window.showToast('New passwords do not match!', 'error');
      return;
    }

    try {
      const res = await adminFetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.showToast('Admin password updated successfully! Please remember your new password.', 'success');
        document.getElementById('change-password-form').reset();
      } else {
        window.showToast(data.error || 'Failed to update password', 'error');
      }
    } catch (err) {
      window.showToast(err.message || 'Error updating password', 'error');
    }
  };

  // Route listener: Check if path or hash is admin portal
  function handleRoute() {
    const isSecretRoute = 
      window.location.hash === '#admin-portal' || 
      window.location.hash === '#admin' || 
      window.location.pathname === '/admin-portal' || 
      window.location.pathname === '/admin';

    if (isSecretRoute) {
      checkAuth();
    } else {
      document.getElementById('admin-view-wrap').style.display = 'none';
      document.getElementById('public-view-wrap').style.display = 'block';
    }
  }

  window.addEventListener('hashchange', handleRoute);
  document.addEventListener('DOMContentLoaded', handleRoute);

  // Discreet secret shortcut: Ctrl+Shift+A opens the portal
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      window.location.hash = '#admin-portal';
    }
  });

})();

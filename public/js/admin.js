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
    document.getElementById('public-view-wrap').style.display = 'none';

    if (!adminState.token) {
      showLoginScreen();
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
    showLoginScreen();
    return false;
  }

  function showLoginScreen() {
    document.getElementById('public-view-wrap').style.display = 'none';
    document.getElementById('admin-view-wrap').style.display = 'none';
    const loginScreen = document.getElementById('admin-login-screen');
    if (loginScreen) {
      loginScreen.style.display = 'flex';
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      if (emailInput) emailInput.value = '';
      if (passInput) passInput.value = '';
    }
  }

  window.exitAdminToPublic = function (e) {
    if (e) e.preventDefault();
    const loginScreen = document.getElementById('admin-login-screen');
    const adminWrap = document.getElementById('admin-view-wrap');
    const publicWrap = document.getElementById('public-view-wrap');
    if (loginScreen) loginScreen.style.display = 'none';
    if (adminWrap) adminWrap.style.display = 'none';
    if (publicWrap) publicWrap.style.display = 'block';
    window.location.hash = '';
  };

  window.togglePasswordVisibility = function (inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btnEl.textContent = 'Hide Password';
    } else {
      input.type = 'password';
      btnEl.textContent = 'Show Password';
    }
  };

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
        window.showToast('Welcome to Atharva Operations Dashboard!', 'success');
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
    const loginScreen = document.getElementById('admin-login-screen');
    const adminWrap = document.getElementById('admin-view-wrap');
    const publicWrap = document.getElementById('public-view-wrap');
    if (loginScreen) loginScreen.style.display = 'none';
    if (adminWrap) adminWrap.style.display = 'none';
    if (publicWrap) publicWrap.style.display = 'block';
    window.location.hash = '';
    window.showToast('Logged out successfully', 'info');
  };

  // Render UI and load tabs
  async function renderAdminUI() {
    document.getElementById('public-view-wrap').style.display = 'none';
    const loginScreen = document.getElementById('admin-login-screen');
    if (loginScreen) loginScreen.style.display = 'none';
    const adminWrap = document.getElementById('admin-view-wrap');
    if (adminWrap) adminWrap.style.display = 'block';

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

  // TAB 2: Appointments & Site Visits Command Center
  async function renderAppointmentsTab(container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.55rem;font-weight:900;color:#FFFFFF;letter-spacing:-0.02em;">📅 Site Visit & Meeting Bookings</h2>
          <p style="font-size:0.875rem;color:#94A3B8;">Real-time rooftop inspection appointments booked by homeowners and businesses across Madhya Pradesh</p>
        </div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="window.exportAppointmentsCSV()" style="background:#0F1D33;color:#38BDF8;border-color:rgba(56,189,248,0.3);display:inline-flex;align-items:center;gap:0.4rem;">
            ${window.Icons.download} Export CSV
          </button>
          <button class="btn btn-amber btn-sm" onclick="window.openBlockDateModal()">
            ${window.Icons.calendar} Block Date / Slot
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.loadAndDisplayAppointments()">
            Refresh Bookings
          </button>
        </div>
      </div>

      <!-- Quick Status Filter Ribbon & Live Search Bar -->
      <div class="admin-card-pane" style="margin-bottom:1.5rem;padding:1.25rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
          
          <!-- Filter Buttons -->
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;" id="appointment-filter-chips">
            <button class="btn btn-sm" style="background:#0284C7;color:#FFFFFF;border-radius:20px;padding:0.4rem 1rem;" onclick="window.setAppointmentFilter('all', this)">
              All Bookings (<span id="count-all-apts">0</span>)
            </button>
            <button class="btn btn-sm" style="background:#1E293B;color:#FBBF24;border:1px solid rgba(245,158,11,0.3);border-radius:20px;padding:0.4rem 1rem;" onclick="window.setAppointmentFilter('pending', this)">
              ⏳ Pending (<span id="count-pending-apts">0</span>)
            </button>
            <button class="btn btn-sm" style="background:#1E293B;color:#34D399;border:1px solid rgba(52,211,153,0.3);border-radius:20px;padding:0.4rem 1rem;" onclick="window.setAppointmentFilter('confirmed', this)">
              ✅ Confirmed (<span id="count-confirmed-apts">0</span>)
            </button>
            <button class="btn btn-sm" style="background:#1E293B;color:#38BDF8;border:1px solid rgba(56,189,248,0.3);border-radius:20px;padding:0.4rem 1rem;" onclick="window.setAppointmentFilter('today', this)">
              📅 Today's Visits (<span id="count-today-apts">0</span>)
            </button>
            <button class="btn btn-sm" style="background:#1E293B;color:#CBD5E1;border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:0.4rem 1rem;" onclick="window.setAppointmentFilter('completed', this)">
              🏁 Completed (<span id="count-completed-apts">0</span>)
            </button>
          </div>

          <!-- Instant Live Search -->
          <div style="min-width:260px;flex:1;max-width:380px;">
            <input type="text" id="appointment-search-input" class="form-input admin-dark-input" placeholder="🔍 Search customer, phone, city..." oninput="window.filterAppointmentsLive()" style="padding:0.55rem 0.85rem;font-size:0.85rem;">
          </div>
        </div>
      </div>

      <div id="appointments-table-wrap" class="admin-table-container">
        <div style="padding:2.5rem;text-align:center;color:#94A3B8;">Loading appointments...</div>
      </div>
    `;

    await loadAndDisplayAppointments();
  }

  adminState.appointmentFilter = 'all';

  window.setAppointmentFilter = function (filter, btnEl) {
    adminState.appointmentFilter = filter;
    document.querySelectorAll('#appointment-filter-chips button').forEach(b => {
      b.style.background = '#1E293B';
    });
    if (btnEl) btnEl.style.background = '#0284C7';
    window.filterAppointmentsLive();
  };

  window.filterAppointmentsLive = function () {
    const search = (document.getElementById('appointment-search-input')?.value || '').toLowerCase().trim();
    const todayStr = new Date().toISOString().split('T')[0];

    const filtered = (adminState.appointments || []).filter(a => {
      const matchSearch = !search ||
        (a.full_name || '').toLowerCase().includes(search) ||
        (a.phone || '').includes(search) ||
        (a.city || '').toLowerCase().includes(search) ||
        (a.reference_no || '').toLowerCase().includes(search);

      let matchFilter = true;
      if (adminState.appointmentFilter === 'pending') matchFilter = a.status === 'pending';
      else if (adminState.appointmentFilter === 'confirmed') matchFilter = a.status === 'confirmed';
      else if (adminState.appointmentFilter === 'completed') matchFilter = a.status === 'completed';
      else if (adminState.appointmentFilter === 'today') matchFilter = a.appointment_date === todayStr;

      return matchSearch && matchFilter;
    });

    renderAppointmentsTable(filtered);
  };

  async function loadAndDisplayAppointments() {
    try {
      const res = await adminFetch('/api/appointments');
      const data = await res.json();
      if (data.success && data.appointments) {
        adminState.appointments = data.appointments;

        // Update counts
        const todayStr = new Date().toISOString().split('T')[0];
        const elAll = document.getElementById('count-all-apts');
        if (elAll) elAll.textContent = data.appointments.length;
        const elPending = document.getElementById('count-pending-apts');
        if (elPending) elPending.textContent = data.appointments.filter(a => a.status === 'pending').length;
        const elConfirmed = document.getElementById('count-confirmed-apts');
        if (elConfirmed) elConfirmed.textContent = data.appointments.filter(a => a.status === 'confirmed').length;
        const elToday = document.getElementById('count-today-apts');
        if (elToday) elToday.textContent = data.appointments.filter(a => a.appointment_date === todayStr).length;
        const elCompleted = document.getElementById('count-completed-apts');
        if (elCompleted) elCompleted.textContent = data.appointments.filter(a => a.status === 'completed').length;

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
      wrap.innerHTML = '<div style="padding:3rem;text-align:center;color:#94A3B8;">No meeting appointments match your filter.</div>';
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    wrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Booking Ref / Date</th>
            <th>Time Slot</th>
            <th>Customer & City</th>
            <th>Consultation Type</th>
            <th>Monthly Bill & Roof Notes</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${apts.map(a => {
            const isToday = a.appointment_date === todayStr;
            const waPhone = a.phone.replace(/\\D/g, '');
            const waText = encodeURIComponent(
              `Hello ${a.full_name}, this is Atharva Enterprises regarding your scheduled solar site inspection (${a.reference_no}) booked for ${a.appointment_date} (${a.time_slot}) in ${a.city}. Our survey team will coordinate with you. Please let us know if you need any adjustments.`
            );

            return `
              <tr>
                <td>
                  <strong style="color:#FFFFFF;font-size:0.9rem;">${a.reference_no}</strong><br>
                  <span style="font-weight:700;color:${isToday ? '#38BDF8' : '#CBD5E1'};font-size:0.85rem;">
                    📅 ${a.appointment_date}
                  </span>
                  ${isToday ? '<span class="badge" style="background:#EF4444;color:#FFFFFF;font-size:0.65rem;margin-left:4px;padding:0.15rem 0.4rem;">TODAY</span>' : ''}
                </td>
                <td>
                  <span class="badge" style="background:rgba(56,189,248,0.15);color:#38BDF8;border:1px solid rgba(56,189,248,0.3);font-size:0.75rem;white-space:nowrap;">
                    ⏰ ${a.time_slot}
                  </span>
                </td>
                <td>
                  <strong style="color:#FFFFFF;font-size:0.95rem;">${a.full_name}</strong><br>
                  <span style="font-size:0.825rem;color:#94A3B8;font-family:monospace;">📞 ${a.phone}</span><br>
                  <span style="font-size:0.75rem;color:#34D399;font-weight:700;">📍 ${a.city} (${(a.property_type || '').toUpperCase()})</span>
                </td>
                <td>
                  <span class="badge" style="background:rgba(255,255,255,0.08);color:#F1F5F9;font-size:0.725rem;font-weight:700;text-transform:uppercase;">
                    ${(a.meeting_type || 'site_visit').replace('_', ' ')}
                  </span>
                </td>
                <td style="max-width:220px;">
                  ${a.bill_range ? `<span style="font-size:0.75rem;color:#FBBF24;font-weight:700;">⚡ Bill: ${a.bill_range}</span><br>` : ''}
                  <span style="font-size:0.78rem;color:#94A3B8;line-height:1.35;display:block;">
                    ${a.requirements ? a.requirements.slice(0, 65) + (a.requirements.length > 65 ? '...' : '') : 'No special notes'}
                  </span>
                  ${a.admin_notes ? `<span style="font-size:0.72rem;color:#34D399;display:block;margin-top:2px;">📝 Note: ${a.admin_notes}</span>` : ''}
                </td>
                <td>
                  <select class="form-select admin-dark-input" style="font-size:0.8rem;padding:0.4rem 0.65rem;font-weight:700;border-radius:8px;color:${
                    a.status === 'confirmed' ? '#34D399' : a.status === 'pending' ? '#FBBF24' : a.status === 'completed' ? '#38BDF8' : '#EF4444'
                  };" onchange="window.updateAppointmentStatus(${a.id}, this.value)">
                    <option value="pending" ${a.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                    <option value="confirmed" ${a.status === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
                    <option value="completed" ${a.status === 'completed' ? 'selected' : ''}>🏁 Completed</option>
                    <option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                    <option value="rejected" ${a.status === 'rejected' ? 'selected' : ''}>🚫 Rejected</option>
                  </select>
                </td>
                <td>
                  <div style="display:flex;gap:0.45rem;align-items:center;">
                    <a href="https://wa.me/${waPhone}?text=${waText}" target="_blank" class="btn btn-sm" style="background:#25D366;color:#FFFFFF;padding:0.4rem 0.65rem;border-radius:7px;font-size:0.75rem;display:inline-flex;align-items:center;gap:0.25rem;" title="Chat with customer on WhatsApp">
                      💬 WA
                    </a>
                    <a href="tel:${a.phone.replace(/\\s/g, '')}" class="btn btn-sm" style="background:#0F1D33;color:#F1F5F9;border:1px solid rgba(255,255,255,0.2);padding:0.4rem 0.65rem;border-radius:7px;" title="Direct Call">
                      ${window.Icons.phone}
                    </a>
                    <button class="btn btn-sm" style="background:#1E293B;color:#CBD5E1;border:1px solid rgba(255,255,255,0.12);padding:0.4rem 0.55rem;border-radius:7px;font-size:0.75rem;" onclick="window.editAppointmentNotes(${a.id}, '${(a.admin_notes || '').replace(/'/g, "\\'")}')" title="Technician / Survey Notes">
                      📝 Notes
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  window.editAppointmentNotes = function (id, currentNotes) {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="background:#0E1D36;padding:1.5rem;border-radius:14px;color:#FFFFFF;">
        <h3 style="font-size:1.35rem;font-weight:800;color:#FFFFFF;margin-bottom:0.5rem;">Survey Engineer & Inspection Notes</h3>
        <p style="color:#94A3B8;font-size:0.825rem;margin-bottom:1.25rem;">Record rooftop inspection details, shadow analysis notes, or quotation status</p>
        <textarea id="apt-note-text" class="form-textarea admin-dark-input" rows="4" style="margin-bottom:1.25rem;width:100%;">${currentNotes || ''}</textarea>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button class="btn btn-secondary btn-sm" style="background:#1E293B;color:#CBD5E1;" onclick="window.closeModal()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="window.saveAppointmentNote(${id})">Save Survey Notes</button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  };

  window.saveAppointmentNote = async function (id) {
    const adminNotes = document.getElementById('apt-note-text').value;
    try {
      const res = await adminFetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes })
      });
      if (res.ok) {
        window.closeModal();
        window.showToast('Survey notes saved successfully', 'success');
        loadAndDisplayAppointments();
      }
    } catch (err) {
      window.showToast('Failed to save notes', 'error');
    }
  };

  window.exportAppointmentsCSV = function () {
    const apts = adminState.appointments || [];
    if (apts.length === 0) {
      window.showToast('No appointments to export', 'info');
      return;
    }
    const headers = ['Ref No', 'Date', 'Time Slot', 'Customer Name', 'Phone', 'City', 'Property Type', 'Meeting Type', 'Bill Range', 'Status', 'Requirements', 'Admin Notes'];
    const rows = apts.map(a => [
      `"${a.reference_no}"`,
      `"${a.appointment_date}"`,
      `"${a.time_slot}"`,
      `"${a.full_name}"`,
      `"${a.phone}"`,
      `"${a.city}"`,
      `"${a.property_type}"`,
      `"${a.meeting_type}"`,
      `"${a.bill_range || ''}"`,
      `"${a.status}"`,
      `"${(a.requirements || '').replace(/"/g, '""')}"`,
      `"${(a.admin_notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Atharva_Solar_Bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.showToast('Bookings exported to CSV successfully!', 'success');
  };

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

/**
 * Atharva Enterprises - Secure Admin Dashboard Controller
 * Online Meeting Management, Google Meet Integration, Lead Management, CMS & Security Audit
 */

(function () {
  'use strict';

  const adminState = {
    token: localStorage.getItem('atharva_admin_token') || '',
    user: null,
    currentTab: 'appointments',
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
    const publicWrap = document.getElementById('public-view-wrap');
    if (publicWrap) publicWrap.style.display = 'none';

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
    } catch {
      // not authenticated
    }
    showLoginScreen();
    return false;
  }

  function showLoginScreen() {
    const publicWrap = document.getElementById('public-view-wrap');
    if (publicWrap) publicWrap.style.display = 'none';
    const adminWrap = document.getElementById('admin-view-wrap');
    if (adminWrap) adminWrap.style.display = 'none';
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
    window.location.href = '/';
  };

  window.togglePasswordVisibility = function (inputId, triggerEl) {
    const el = document.getElementById(inputId);
    if (!el) return;
    if (el.type === 'password') {
      el.type = 'text';
      triggerEl.textContent = 'Hide Password';
    } else {
      el.type = 'password';
      triggerEl.textContent = 'Show Password';
    }
  };

  window.handleAdminLogin = async function (e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying Credentials...';

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.status === 429) {
        window.showToast(data.error || 'Too many attempts. Account locked temporarily.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Operations Portal';
        return;
      }

      if (!res.ok || !data.success) {
        window.showToast(data.error || 'Invalid email or password', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Operations Portal';
        return;
      }

      adminState.token = data.token;
      adminState.user = data.user;
      localStorage.setItem('atharva_admin_token', data.token);

      window.showToast(`Welcome back, ${data.user.name}!`, 'success');
      document.getElementById('admin-login-screen').style.display = 'none';
      renderAdminUI();
    } catch {
      window.showToast('Authentication connection error. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In to Operations Portal';
    }
  };

  window.adminLogout = async function () {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminState.token}`
        }
      });
    } catch {}

    adminState.token = '';
    adminState.user = null;
    localStorage.removeItem('atharva_admin_token');
    showLoginScreen();
    window.showToast('Signed out of admin portal', 'info');
  };

  function renderAdminUI() {
    const loginScreen = document.getElementById('admin-login-screen');
    const adminWrap = document.getElementById('admin-view-wrap');
    const publicWrap = document.getElementById('public-view-wrap');

    if (loginScreen) loginScreen.style.display = 'none';
    if (publicWrap) publicWrap.style.display = 'none';
    if (adminWrap) adminWrap.style.display = 'block';

    loadStats();
    switchTab(adminState.currentTab || 'appointments');
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
    if (tab === 'appointments') renderAppointmentsTab(pane);
    else if (tab === 'leads') renderLeadsTab(pane);
    else if (tab === 'analytics') renderAnalyticsTab(pane);
    else if (tab === 'brands') renderBrandsTab(pane);
    else if (tab === 'security') renderSecurityTab(pane);
  }

  window.switchAdminTab = switchTab;

  // TAB 1: Online Meetings & Consultations Command Center
  async function renderAppointmentsTab(container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.55rem;font-weight:900;color:#FFFFFF;letter-spacing:-0.02em;">📅 Online Meeting Bookings & Video Rooms</h2>
          <p style="font-size:0.875rem;color:#94A3B8;">Approve bookings, assign Google Meet links, reschedule slots, and manage client consultations</p>
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
              📅 Today's Meetings (<span id="count-today-apts">0</span>)
            </button>
            <button class="btn btn-sm" style="background:#1E293B;color:#CBD5E1;border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:0.4rem 1rem;" onclick="window.setAppointmentFilter('completed', this)">
              🏁 Completed (<span id="count-completed-apts">0</span>)
            </button>
          </div>

          <!-- Live Search -->
          <div style="min-width:260px;flex:1;max-width:380px;">
            <input type="text" id="appointment-search-input" class="form-input admin-dark-input" placeholder="🔍 Search customer, email, ref ID..." oninput="window.filterAppointmentsLive()" style="padding:0.55rem 0.85rem;font-size:0.85rem;">
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
        (a.email || '').toLowerCase().includes(search) ||
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
            <th>Customer & Email</th>
            <th>Consultation Type</th>
            <th>Google Meet Link</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${apts.map(a => {
            const isToday = a.appointment_date === todayStr;
            const hasMeetLink = Boolean(a.meeting_link && a.meeting_link.trim());

            return `
              <tr>
                <td>
                  <strong style="color:#FFFFFF;font-size:0.9rem;font-family:monospace;">${a.reference_no}</strong><br>
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
                  <span style="font-size:0.825rem;color:#38BDF8;">✉️ ${a.email}</span><br>
                  <span style="font-size:0.75rem;color:#34D399;font-weight:700;">📍 ${a.city || 'Madhya Pradesh'} (${(a.property_type || 'residential').toUpperCase()})</span>
                </td>
                <td>
                  <span class="badge" style="background:rgba(255,255,255,0.08);color:#F1F5F9;font-size:0.725rem;font-weight:700;text-transform:uppercase;">
                    ${(a.meeting_type || 'solar_consultation').replace(/_/g, ' ')}
                  </span>
                  ${a.bill_range ? `<br><small style="color:#FBBF24;">⚡ ${a.bill_range}</small>` : ''}
                </td>
                <td>
                  ${hasMeetLink ? `
                    <div style="display:flex;align-items:center;gap:0.4rem;">
                      <a href="${a.meeting_link}" target="_blank" rel="noopener noreferrer" style="color:#38BDF8;font-size:0.8rem;text-decoration:underline;word-break:break-all;">
                        ${a.meeting_link.replace('https://meet.google.com/', '')}
                      </a>
                      <button class="btn btn-sm" onclick="window.openAssignMeetModal(${a.id}, '${a.meeting_link}')" title="Edit Link" style="background:#1E293B;padding:0.25rem 0.5rem;font-size:0.7rem;color:#CBD5E1;">
                        ✏️
                      </button>
                    </div>
                  ` : `
                    <div style="display:flex;gap:0.4rem;">
                      <button class="btn btn-sm" onclick="window.autoGenerateMeet(${a.id})" style="background:#0284C7;color:#FFFFFF;padding:0.35rem 0.6rem;font-size:0.75rem;" title="Auto generate Google Meet room">
                        ⚡ Generate Meet
                      </button>
                      <button class="btn btn-sm" onclick="window.openAssignMeetModal(${a.id}, '')" style="background:#1E293B;color:#CBD5E1;padding:0.35rem 0.5rem;font-size:0.75rem;">
                        Paste Link
                      </button>
                    </div>
                  `}
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
                  <div style="display:flex;gap:0.4rem;align-items:center;">
                    <button class="btn btn-sm" style="background:#0F1D33;color:#38BDF8;border:1px solid rgba(56,189,248,0.3);padding:0.4rem 0.65rem;font-size:0.75rem;" onclick="window.openRescheduleModal(${a.id}, '${a.appointment_date}', '${a.time_slot}')" title="Reschedule Date & Slot">
                      🔄 Reschedule
                    </button>
                    <button class="btn btn-sm" style="background:#1E293B;color:#CBD5E1;border:1px solid rgba(255,255,255,0.12);padding:0.4rem 0.55rem;font-size:0.75rem;" onclick="window.editAppointmentNotes(${a.id}, '${(a.admin_notes || '').replace(/'/g, "\\'")}')" title="Internal Notes">
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

  // Assign or Edit Meeting Link Modal
  window.openAssignMeetModal = function (id, currentLink) {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="background:#0E1D36;padding:1.75rem;border-radius:14px;color:#FFFFFF;">
        <h3 style="font-size:1.35rem;font-weight:800;color:#FFFFFF;margin-bottom:0.5rem;">Assign Google Meet Room</h3>
        <p style="color:#94A3B8;font-size:0.85rem;margin-bottom:1.25rem;">The link will be privately delivered to the customer upon confirmation.</p>
        
        <div class="form-group" style="margin-bottom:1.25rem;">
          <label class="form-label" style="color:#CBD5E1;">Google Meet / Video Room URL</label>
          <input type="url" id="meet-url-input" class="form-input admin-dark-input" placeholder="https://meet.google.com/xxx-yyyy-zzz" value="${currentLink || ''}">
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.5rem;flex-wrap:wrap;gap:0.75rem;">
          <button type="button" class="btn btn-sm" onclick="window.autoGenerateMeet(${id})" style="background:#0284C7;color:#FFFFFF;">
            ⚡ Auto-Generate Google Meet Room
          </button>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="window.closeModal()" style="background:#1E293B;color:#CBD5E1;">Cancel</button>
            <button class="btn btn-primary btn-sm" onclick="window.saveMeetLink(${id})">Save Link</button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
  };

  window.saveMeetLink = async function (id) {
    const link = document.getElementById('meet-url-input').value.trim();
    if (!link) {
      window.showToast('Please enter a valid meeting URL', 'error');
      return;
    }

    try {
      const res = await adminFetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingLink: link })
      });
      if (res.ok) {
        window.closeModal();
        window.showToast('Meeting link assigned successfully', 'success');
        loadAndDisplayAppointments();
      }
    } catch {
      window.showToast('Failed to save meeting link', 'error');
    }
  };

  window.autoGenerateMeet = async function (id) {
    try {
      const res = await adminFetch(`/api/appointments/${id}/generate-meet`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.closeModal();
        window.showToast(`Google Meet link generated: ${data.meetingLink}`, 'success');
        loadAndDisplayAppointments();
      } else {
        window.showToast(data.error || 'Failed to generate link', 'error');
      }
    } catch {
      window.showToast('Error generating meeting link', 'error');
    }
  };

  // Reschedule Appointment Modal
  window.openRescheduleModal = async function (id, currentDate, currentSlot) {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    content.innerHTML = `
      <div style="background:#0E1D36;padding:1.75rem;border-radius:14px;color:#FFFFFF;">
        <h3 style="font-size:1.35rem;font-weight:800;color:#FFFFFF;margin-bottom:0.5rem;">Reschedule Online Consultation</h3>
        <p style="color:#94A3B8;font-size:0.85rem;margin-bottom:1.25rem;">Current schedule: 📅 ${currentDate} (${currentSlot})</p>

        <form id="reschedule-form" onsubmit="window.handleRescheduleSubmit(event, ${id})">
          <div class="form-group" style="margin-bottom:1.25rem;">
            <label class="form-label" style="color:#CBD5E1;">New Consultation Date <span class="required">*</span></label>
            <input type="date" id="reschedule-date" class="form-input admin-dark-input" required min="${minDate}" value="${currentDate}" onchange="window.loadRescheduleSlots(this.value)">
          </div>

          <div class="form-group" style="margin-bottom:1.5rem;">
            <label class="form-label" style="color:#CBD5E1;">Select New Available Slot <span class="required">*</span></label>
            <div id="reschedule-slots-container">
              <span style="font-size:0.85rem;color:#94A3B8;">Checking slot availability...</span>
            </div>
          </div>

          <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.closeModal()" style="background:#1E293B;color:#CBD5E1;">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Confirm Reschedule</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add('active');
    window.loadRescheduleSlots(currentDate);
  };

  window.loadRescheduleSlots = async function (dateStr) {
    const container = document.getElementById('reschedule-slots-container');
    if (!container) return;

    try {
      const res = await fetch(`/api/slots/available?date=${dateStr}`);
      const data = await res.json();
      const slots = data.availableSlots || [];

      if (slots.length === 0) {
        container.innerHTML = '<span style="color:#F87171;font-size:0.85rem;">No slots available for this date.</span>';
        return;
      }

      container.innerHTML = `
        <select id="reschedule-slot-select" class="form-select admin-dark-input" required>
          ${slots.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      `;
    } catch {
      container.innerHTML = '<span style="color:#F87171;font-size:0.85rem;">Error loading slots</span>';
    }
  };

  window.handleRescheduleSubmit = async function (e, id) {
    e.preventDefault();
    const newDate = document.getElementById('reschedule-date').value;
    const newSlot = document.getElementById('reschedule-slot-select')?.value;

    if (!newDate || !newSlot) {
      window.showToast('Please select both a date and an available slot', 'error');
      return;
    }

    try {
      const res = await adminFetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rescheduleDate: newDate,
          rescheduleSlot: newSlot
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.closeModal();
        window.showToast(`Meeting rescheduled to ${newDate} (${newSlot})`, 'success');
        loadAndDisplayAppointments();
      } else {
        window.showToast(data.error || 'Reschedule conflict', 'error');
      }
    } catch {
      window.showToast('Network error during reschedule', 'error');
    }
  };

  window.editAppointmentNotes = function (id, currentNotes) {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="background:#0E1D36;padding:1.5rem;border-radius:14px;color:#FFFFFF;">
        <h3 style="font-size:1.35rem;font-weight:800;color:#FFFFFF;margin-bottom:0.5rem;">Consultation & Technical Notes</h3>
        <p style="color:#94A3B8;font-size:0.825rem;margin-bottom:1.25rem;">Record load requirements, system configuration proposals, or followup actions</p>
        <textarea id="apt-note-text" class="form-textarea admin-dark-input" rows="4" style="margin-bottom:1.25rem;width:100%;">${currentNotes || ''}</textarea>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button class="btn btn-secondary btn-sm" style="background:#1E293B;color:#CBD5E1;" onclick="window.closeModal()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="window.saveAppointmentNote(${id})">Save Notes</button>
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
        window.showToast('Consultation notes saved successfully', 'success');
        loadAndDisplayAppointments();
      }
    } catch {
      window.showToast('Failed to save notes', 'error');
    }
  };

  window.updateAppointmentStatus = async function (id, status) {
    try {
      const res = await adminFetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        window.showToast(`Appointment status updated to ${status.toUpperCase()}`, 'success');
        loadStats();
      }
    } catch {
      window.showToast('Failed to update appointment', 'error');
    }
  };

  window.exportAppointmentsCSV = function () {
    const apts = adminState.appointments || [];
    if (apts.length === 0) {
      window.showToast('No appointments to export', 'info');
      return;
    }
    const headers = ['Ref No', 'Date', 'Time Slot', 'Customer Name', 'Email', 'City', 'Property Type', 'Meeting Type', 'Google Meet Link', 'Bill Range', 'Status', 'Requirements', 'Admin Notes'];
    const rows = apts.map(a => [
      `"${a.reference_no}"`,
      `"${a.appointment_date}"`,
      `"${a.time_slot}"`,
      `"${a.full_name}"`,
      `"${a.email}"`,
      `"${a.city || ''}"`,
      `"${a.property_type || ''}"`,
      `"${a.meeting_type || ''}"`,
      `"${a.meeting_link || ''}"`,
      `"${a.bill_range || ''}"`,
      `"${a.status}"`,
      `"${(a.requirements || '').replace(/"/g, '""')}"`,
      `"${(a.admin_notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Atharva_Solar_Consultations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.showToast('Bookings exported to CSV successfully!', 'success');
  };

  window.openBlockDateModal = function () {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    content.innerHTML = `
      <div style="background:#0E1D36;padding:1.75rem;border-radius:14px;color:#FFFFFF;">
        <h3 style="font-size:1.4rem;font-weight:800;color:#FFFFFF;margin-bottom:0.5rem;">Block Date or Time Slot</h3>
        <p style="color:#94A3B8;font-size:0.875rem;margin-bottom:1.5rem;">Prevent customers from reserving specific dates or slots</p>

        <form id="block-slot-form" onsubmit="window.handleBlockSlotSubmit(event)">
          <div class="form-group" style="margin-bottom:1rem;">
            <label class="form-label" style="color:#CBD5E1;">Date to Block <span class="required">*</span></label>
            <input type="date" id="block-date" class="form-input admin-dark-input" required min="${minDate}">
          </div>
          <div class="form-group" style="margin-bottom:1rem;">
            <label class="form-label" style="color:#CBD5E1;">Specific Time Slot (Optional)</label>
            <select id="block-slot" class="form-select admin-dark-input">
              <option value="">Block Entire Day</option>
              <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
              <option value="11:30 AM - 12:30 PM">11:30 AM - 12:30 PM</option>
              <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
              <option value="03:30 PM - 04:30 PM">03:30 PM - 04:30 PM</option>
              <option value="05:00 PM - 06:00 PM">05:00 PM - 06:00 PM</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:1.5rem;">
            <label class="form-label" style="color:#CBD5E1;">Reason</label>
            <input type="text" id="block-reason" class="form-input admin-dark-input" placeholder="e.g. Public Holiday, Technical Audit Day">
          </div>
          <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.closeModal()" style="background:#1E293B;color:#CBD5E1;">Cancel</button>
            <button type="submit" class="btn btn-amber btn-sm">Block Date</button>
          </div>
        </form>
      </div>
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
    } catch {
      window.showToast('Failed to block date', 'error');
    }
  };

  // TAB 2: Customer Enquiries & Leads
  async function renderLeadsTab(container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.5rem;font-weight:800;color:var(--navy-900);">Customer Enquiries & Solar Messages</h2>
          <p style="font-size:0.875rem;color:var(--text-muted);">Confidential messages submitted through website enquiry forms</p>
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
        <input type="text" id="lead-search" class="form-input" style="max-width:300px;" placeholder="Search name, email, city, ref..." oninput="window.filterLeads()">
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
            <th>Type / Topic</th>
            <th>Message Details</th>
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
                <span style="font-size:0.8rem;color:#0284C7;">✉️ ${lead.email || 'No email'}</span><br>
                <span style="font-size:0.75rem;color:var(--solar-green);">${lead.city || 'Madhya Pradesh'}</span>
              </td>
              <td>
                <span class="badge-tag badge-blue" style="font-size:0.7rem;margin:0;">${(lead.type || '').replace(/_/g, ' ')}</span>
                ${lead.service_interest ? `<br><small style="color:var(--solar-amber);font-weight:700;">${lead.service_interest}</small>` : ''}
              </td>
              <td style="max-width:250px;">
                <span style="font-size:0.8rem;color:var(--text-main);line-height:1.4;display:block;">${lead.message || 'No message content'}</span>
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
                <button class="btn btn-secondary btn-sm" onclick="window.editLeadNotes(${lead.id}, '${(lead.notes || '').replace(/'/g, "\\'")}')">
                  Notes
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  window.filterLeads = function () {
    const search = (document.getElementById('lead-search').value || '').toLowerCase();
    const status = document.getElementById('lead-status-filter').value;

    const filtered = adminState.leads.filter(l => {
      const matchSearch = !search || 
        l.name.toLowerCase().includes(search) || 
        (l.email && l.email.toLowerCase().includes(search)) ||
        (l.city && l.city.toLowerCase().includes(search)) ||
        l.reference_no.toLowerCase().includes(search);
      const matchStatus = status === 'all' || l.status === status;
      return matchSearch && matchStatus;
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
        window.showToast('Enquiry status updated', 'success');
        loadStats();
      }
    } catch {
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
    } catch {
      window.showToast('Failed to save notes', 'error');
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
          <p style="font-size:0.875rem;color:var(--text-muted);">Toggle brand product availability and highlight offerings</p>
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
    } catch {
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
    } catch {
      window.showToast('Failed to update brand status', 'error');
    }
  };

  // TAB 4: Website Traffic & Live Visitor Analytics
  async function renderAnalyticsTab(container) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);">
        <div>Loading visitor traffic & analytics...</div>
      </div>
    `;

    try {
      const res = await adminFetch('/api/admin/analytics');
      const data = await res.json();
      const a = data.analytics || {};

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
            <p style="font-size:0.875rem;color:var(--text-muted);">Real-time metrics on visitor volume and devices (Admin Protected)</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.refreshAnalyticsTab()">
            Refresh Live Traffic
          </button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:1rem;margin-bottom:1.75rem;">
          <div style="background:#FFFFFF;padding:1.25rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);">
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.35rem;">Total Page Views (Hits)</div>
            <div style="font-size:2rem;font-weight:900;color:var(--navy-900);">${a.totalViews || 0}</div>
          </div>
          <div style="background:#FFFFFF;padding:1.25rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);">
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.35rem;">Total Unique Visitors</div>
            <div style="font-size:2rem;font-weight:900;color:#0284C7;">${a.uniqueVisitors || 0}</div>
          </div>
          <div style="background:#FFFFFF;padding:1.25rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);">
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.35rem;">Today's Page Views</div>
            <div style="font-size:2rem;font-weight:900;color:var(--solar-green);">${a.todayViews || 0}</div>
          </div>
          <div style="background:#FFFFFF;padding:1.25rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);">
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.35rem;">Today's Unique Visitors</div>
            <div style="font-size:2rem;font-weight:900;color:var(--solar-amber);">${a.todayUnique || 0}</div>
          </div>
        </div>

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

  // TAB 5: Admin Password & Security Controls
  function renderSecurityTab(container) {
    container.innerHTML = `
      <div style="max-width:550px;">
        <div style="margin-bottom:1.5rem;">
          <h2 style="font-size:1.5rem;font-weight:800;color:var(--navy-900);">Admin Password & Security Settings</h2>
          <p style="font-size:0.875rem;color:var(--text-muted);">Encrypted with PBKDF2 (SHA-512, 100,000 iterations and random salt)</p>
        </div>

        <div style="background:#FFFFFF;padding:1.75rem;border-radius:12px;border:1px solid var(--border-color);box-shadow:var(--shadow-sm);">
          <form id="change-password-form" onsubmit="window.handleChangePassword(event)">
            <div class="form-group" style="margin-bottom:1.25rem;">
              <label class="form-label">Current Password</label>
              <input type="password" id="cp-current" class="form-input" required placeholder="Enter current admin password">
            </div>

            <div class="form-group" style="margin-bottom:1.25rem;">
              <label class="form-label">New Secret Password (min 8 characters)</label>
              <input type="password" id="cp-new" class="form-input" required minlength="8" placeholder="Enter new secret password">
            </div>

            <div class="form-group" style="margin-bottom:1.5rem;">
              <label class="form-label">Confirm New Password</label>
              <input type="password" id="cp-confirm" class="form-input" required minlength="8" placeholder="Re-type new secret password">
            </div>

            <button type="submit" class="btn btn-primary">
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
        window.showToast('Admin password updated successfully with PBKDF2 encryption!', 'success');
        document.getElementById('change-password-form').reset();
      } else {
        window.showToast(data.error || 'Failed to update password', 'error');
      }
    } catch (err) {
      window.showToast(err.message || 'Error updating password', 'error');
    }
  };

  // Route listener
  function handleRoute() {
    const isSecretRoute = 
      window.location.pathname.includes('admin') ||
      window.location.hash === '#admin-portal' || 
      window.location.hash === '#admin';

    if (isSecretRoute || document.getElementById('admin-view-wrap')) {
      checkAuth();
    } else {
      const adminWrap = document.getElementById('admin-view-wrap');
      if (adminWrap) adminWrap.style.display = 'none';
      const publicWrap = document.getElementById('public-view-wrap');
      if (publicWrap) publicWrap.style.display = 'block';
    }
  }

  window.addEventListener('hashchange', handleRoute);
  document.addEventListener('DOMContentLoaded', handleRoute);

  // Discreet shortcut: Ctrl+Shift+A opens the portal
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      window.location.hash = '#admin-portal';
    }
  });

})();

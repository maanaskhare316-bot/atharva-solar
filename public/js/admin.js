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

  // Toast notification system for admin
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
    }, 4000);
  }
  window.showToast = showToast;

  // Global Modal Control for Admin
  window.closeModal = function () {
    const modal = document.getElementById('generic-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  };

  // Helper for authenticated fetch
  async function adminFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (adminState.token) {
      options.headers['Authorization'] = `Bearer ${adminState.token}`;
    }
    const res = await fetch(url, options);
    if (res.status === 401) {
      adminLogout(true);
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
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying Credentials...';
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.status === 429) {
        showToast(data.error || 'Too many attempts. Account locked temporarily.', 'error');
        return;
      }

      if (!res.ok || !data.success) {
        showToast(data.error || 'Invalid email or password', 'error');
        return;
      }

      adminState.token = data.token;
      adminState.user = data.user;
      localStorage.setItem('atharva_admin_token', data.token);

      showToast(`Welcome back, ${data.user.name}!`, 'success');
      const loginScreen = document.getElementById('admin-login-screen');
      const adminWrap = document.getElementById('admin-view-wrap');
      if (loginScreen) loginScreen.style.display = 'none';
      if (adminWrap) adminWrap.style.display = 'block';
      renderAdminUI();
    } catch (err) {
      console.error('Admin authentication error:', err);
      showToast('Authentication connection error. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Authenticate Session';
      }
    }
  };

  window.adminLogout = async function (silent = false) {
    const currentToken = adminState.token;
    adminState.token = '';
    adminState.user = null;
    localStorage.removeItem('atharva_admin_token');

    if (currentToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        });
      } catch {}
    }

    showLoginScreen();
    if (!silent) {
      showToast('Signed out of admin portal', 'info');
    }
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
      if (b.dataset.tab === tab) {
        b.classList.add('active');
        b.style.color = '#0B1628';
        b.style.borderBottom = '3px solid #E5A93D';
      } else {
        b.classList.remove('active');
        b.style.color = '#64748B';
        b.style.borderBottom = '3px solid transparent';
      }
    });

    const pane = document.getElementById('admin-tab-content');
    if (tab === 'appointments') renderAppointmentsTab(pane);
    else if (tab === 'leads') renderLeadsTab(pane);
    else if (tab === 'security') renderSecurityTab(pane);
    else renderAppointmentsTab(pane);
  }

  window.switchAdminTab = switchTab;

  // TAB 1: Online Meetings & Consultations Command Center (Clean & Beginner-Friendly)
  async function renderAppointmentsTab(container) {
    container.innerHTML = `
      <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);padding:1.5rem 1.75rem;margin-bottom:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;">
          <div>
            <h2 style="font-size:1.45rem;font-weight:800;color:#0B1628;letter-spacing:-0.02em;margin-bottom:0.25rem;">
              📅 Customer Consultation Bookings (ग्राहक मीटिंग्स)
            </h2>
            <p style="font-size:0.875rem;color:#64748B;">
              Every appointment booked on the public website appears here in real-time. Click <strong>"Approve"</strong> or <strong>"Generate Meet"</strong> to confirm.
            </p>
          </div>
          <div style="display:flex;gap:0.65rem;flex-wrap:wrap;">
            <button class="btn btn-sm" onclick="window.loadAndDisplayAppointments()" style="background:#16845B;color:#FFFFFF;border:none;padding:0.5rem 1rem;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:0.4rem;box-shadow:0 2px 6px rgba(22,132,91,0.25);">
              🔄 Refresh List (ताज़ा करें)
            </button>
            <button class="btn btn-sm" onclick="window.exportAppointmentsCSV()" style="background:#F8FAFC;color:#0284C7;border:1.5px solid #CBD5E1;padding:0.5rem 0.95rem;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:0.4rem;">
              ${window.Icons.download} Export CSV
            </button>
            <button class="btn btn-sm" onclick="window.openBlockDateModal()" style="background:#FFFBEB;color:#B45309;border:1.5px solid #FCD34D;padding:0.5rem 0.95rem;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:0.4rem;">
              ${window.Icons.calendar} Block Date / Slot
            </button>
          </div>
        </div>

        <!-- Filter Chips & Search Bar -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;padding-top:1rem;border-top:1px solid #F1F5F9;">
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;" id="appointment-filter-chips">
            <button class="btn btn-sm" style="background:#0284C7;color:#FFFFFF;border:none;border-radius:20px;padding:0.4rem 1rem;font-weight:700;cursor:pointer;" onclick="window.setAppointmentFilter('all', this)">
              All Bookings (<span id="count-all-apts">0</span>)
            </button>
            <button class="btn btn-sm" style="background:#F1F5F9;color:#92400E;border:1px solid #FCD34D;border-radius:20px;padding:0.4rem 1rem;font-weight:700;cursor:pointer;" onclick="window.setAppointmentFilter('pending', this)">
              ⏳ Pending (<span id="count-pending-apts">0</span>)
            </button>
            <button class="btn btn-sm" style="background:#F1F5F9;color:#065F46;border:1px solid #6EE7B7;border-radius:20px;padding:0.4rem 1rem;font-weight:700;cursor:pointer;" onclick="window.setAppointmentFilter('confirmed', this)">
              ✅ Confirmed (<span id="count-confirmed-apts">0</span>)
            </button>
            <button class="btn btn-sm" style="background:#F1F5F9;color:#0369A1;border:1px solid #7DD3FC;border-radius:20px;padding:0.4rem 1rem;font-weight:700;cursor:pointer;" onclick="window.setAppointmentFilter('today', this)">
              📅 Today (<span id="count-today-apts">0</span>)
            </button>
            <button class="btn btn-sm" style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;border-radius:20px;padding:0.4rem 1rem;font-weight:700;cursor:pointer;" onclick="window.setAppointmentFilter('completed', this)">
              🏁 Completed (<span id="count-completed-apts">0</span>)
            </button>
          </div>

          <!-- Live Search Input -->
          <div style="min-width:260px;flex:1;max-width:380px;">
            <input type="text" id="appointment-search-input" class="form-input" placeholder="🔍 Search customer, email, city, ref ID..." oninput="window.filterAppointmentsLive()" style="padding:0.55rem 0.95rem;font-size:0.875rem;border:1.5px solid #CBD5E1;border-radius:8px;background:#F8FAFC;width:100%;box-sizing:border-box;">
          </div>
        </div>
      </div>

      <!-- Bookings Table Container -->
      <div id="appointments-table-wrap" class="admin-table-container">
        <div style="padding:3rem;text-align:center;color:#64748B;">Loading consultation bookings...</div>
      </div>
    `;

    await loadAndDisplayAppointments();
  }

  adminState.appointmentFilter = 'all';

  window.setAppointmentFilter = function (filter, btnEl) {
    adminState.appointmentFilter = filter;
    document.querySelectorAll('#appointment-filter-chips button').forEach(b => {
      b.style.background = '#F1F5F9';
      b.style.color = '#334155';
    });
    if (btnEl) {
      btnEl.style.background = '#0284C7';
      btnEl.style.color = '#FFFFFF';
    }
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
        updateAppointmentCounts(data.appointments);
        window.filterAppointmentsLive();
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
  }

  function updateAppointmentCounts(apts) {
    const todayStr = new Date().toISOString().split('T')[0];
    const pendingCount = apts.filter(a => a.status === 'pending').length;
    const confirmedCount = apts.filter(a => a.status === 'confirmed').length;
    const todayCount = apts.filter(a => a.appointment_date === todayStr).length;
    const completedCount = apts.filter(a => a.status === 'completed').length;

    const elAll = document.getElementById('count-all-apts');
    if (elAll) elAll.textContent = apts.length;
    const elPending = document.getElementById('count-pending-apts');
    if (elPending) elPending.textContent = pendingCount;
    const elConfirmed = document.getElementById('count-confirmed-apts');
    if (elConfirmed) elConfirmed.textContent = confirmedCount;
    const elToday = document.getElementById('count-today-apts');
    if (elToday) elToday.textContent = todayCount;
    const elCompleted = document.getElementById('count-completed-apts');
    if (elCompleted) elCompleted.textContent = completedCount;

    // Update top KPI cards
    const kpiPending = document.getElementById('kpi-pending-count');
    if (kpiPending) kpiPending.textContent = pendingCount;
    const kpiConfirmed = document.getElementById('kpi-confirmed-count');
    if (kpiConfirmed) kpiConfirmed.textContent = confirmedCount;
    const kpiTotal = document.getElementById('kpi-total-appointments');
    if (kpiTotal) kpiTotal.textContent = apts.length;

    // Update Nav Tab Badge
    const navBadge = document.getElementById('nav-pending-badge');
    if (navBadge) {
      navBadge.textContent = pendingCount;
      navBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }
  }

  window.loadAndDisplayAppointments = loadAndDisplayAppointments;

  function renderAppointmentsTable(apts) {
    const wrap = document.getElementById('appointments-table-wrap');
    if (!wrap) return;

    if (apts.length === 0) {
      wrap.innerHTML = `
        <div style="padding:4rem 2rem;text-align:center;">
          <div style="font-size:2.5rem;margin-bottom:0.75rem;">📅</div>
          <h3 style="font-size:1.15rem;font-weight:700;color:#0B1628;margin-bottom:0.35rem;">No Bookings Found</h3>
          <p style="color:#64748B;font-size:0.875rem;">No consultation bookings match your current search or filter.</p>
        </div>
      `;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    wrap.innerHTML = `
      <table class="admin-modern-table">
        <thead>
          <tr>
            <th>Customer &amp; Ref ID</th>
            <th>Consultation Date &amp; Slot</th>
            <th>Type &amp; Location</th>
            <th>Google Meet Link</th>
            <th>Status</th>
            <th>Quick Actions</th>
          </tr>
        </thead>
        <tbody>
          ${apts.map(a => {
            const isToday = a.appointment_date === todayStr;
            const hasMeetLink = Boolean(a.meeting_link && a.meeting_link.trim());
            const isPending = a.status === 'pending';
            const isConfirmed = a.status === 'confirmed';

            let statusBadge = `<span class="badge-pending">⏳ Under Review</span>`;
            if (a.status === 'confirmed') statusBadge = `<span class="badge-confirmed">✅ Confirmed</span>`;
            else if (a.status === 'completed') statusBadge = `<span class="badge-completed">🏁 Completed</span>`;
            else if (a.status === 'cancelled') statusBadge = `<span class="badge-cancelled">❌ Cancelled</span>`;
            else if (a.status === 'rejected') statusBadge = `<span class="badge-cancelled">🚫 Rejected</span>`;

            return `
              <tr style="${isPending ? 'background:#FFFDF7;' : ''}">
                <td>
                  <strong style="color:#0B1628;font-size:1rem;display:block;">${a.full_name}</strong>
                  <span style="font-size:0.825rem;color:#0284C7;display:block;margin-top:2px;">✉️ ${a.email}</span>
                  <div style="margin-top:4px;">
                    <code style="font-size:0.75rem;background:#F1F5F9;padding:2px 6px;border-radius:4px;color:#475569;font-family:monospace;border:1px solid #E2E8F0;">
                      ${a.reference_no}
                    </code>
                  </div>
                </td>
                <td>
                  <div style="font-weight:800;font-size:0.925rem;color:#0F172A;">
                    📅 ${a.appointment_date}
                    ${isToday ? '<span style="background:#EF4444;color:#FFFFFF;padding:2px 6px;border-radius:4px;font-size:0.65rem;font-weight:800;margin-left:4px;">TODAY</span>' : ''}
                  </div>
                  <div style="color:#0284C7;font-weight:700;font-size:0.825rem;margin-top:3px;">
                    ⏰ ${a.time_slot}
                  </div>
                </td>
                <td>
                  <span style="font-weight:700;color:#334155;text-transform:capitalize;font-size:0.85rem;">
                    ${(a.meeting_type || 'solar_consultation').replace(/_/g, ' ')}
                  </span>
                  <div style="font-size:0.8rem;color:#16845B;font-weight:600;margin-top:2px;">
                    📍 ${a.city || 'Madhya Pradesh'} (${(a.property_type || 'residential').toUpperCase()})
                  </div>
                  ${a.requirements ? `<div style="font-size:0.775rem;color:#64748B;font-style:italic;margin-top:3px;max-width:200px;">"${a.requirements}"</div>` : ''}
                </td>
                <td>
                  ${hasMeetLink ? `
                    <div style="display:flex;align-items:center;gap:0.4rem;">
                      <a href="${a.meeting_link}" target="_blank" rel="noopener noreferrer" style="background:#0284C7;color:#FFFFFF;padding:0.4rem 0.75rem;border-radius:6px;font-size:0.8rem;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:0.35rem;" title="Join Google Meet video room">
                        🎥 Join Meet
                      </a>
                      <button class="btn btn-sm" onclick="window.openAssignMeetModal(${a.id}, '${a.meeting_link}')" title="Edit Meeting Link" style="background:#FFFFFF;border:1px solid #CBD5E1;padding:0.35rem 0.55rem;border-radius:6px;font-size:0.75rem;cursor:pointer;">
                        ✏️
                      </button>
                    </div>
                  ` : `
                    <div style="display:flex;gap:0.4rem;">
                      <button class="btn btn-sm" onclick="window.autoGenerateMeet(${a.id})" style="background:#0284C7;color:#FFFFFF;border:none;padding:0.4rem 0.75rem;border-radius:6px;font-size:0.8rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:0.3rem;" title="Auto generate Google Meet room">
                        ⚡ Generate Meet
                      </button>
                      <button class="btn btn-sm" onclick="window.openAssignMeetModal(${a.id}, '')" style="background:#FFFFFF;border:1px solid #CBD5E1;color:#475569;padding:0.4rem 0.55rem;border-radius:6px;font-size:0.75rem;cursor:pointer;" title="Paste meeting link manually">
                        Paste
                      </button>
                    </div>
                  `}
                </td>
                <td>
                  ${statusBadge}
                </td>
                <td>
                  <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
                    ${isPending ? `
                      <button class="btn btn-sm" onclick="window.quickApproveBooking(${a.id})" style="background:#16845B;color:#FFFFFF;border:none;padding:0.45rem 0.85rem;border-radius:6px;font-size:0.8rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:0.3rem;box-shadow:0 1px 4px rgba(22,132,91,0.25);" title="Approve booking immediately">
                        ✅ Approve
                      </button>
                    ` : ''}

                    ${isConfirmed ? `
                      <button class="btn btn-sm" onclick="window.updateAppointmentStatus(${a.id}, 'completed')" style="background:#475569;color:#FFFFFF;border:none;padding:0.45rem 0.85rem;border-radius:6px;font-size:0.8rem;font-weight:700;cursor:pointer;" title="Mark meeting completed">
                        🏁 Complete
                      </button>
                    ` : ''}

                    <button class="btn btn-sm" onclick="window.openRescheduleModal(${a.id}, '${a.appointment_date}', '${a.time_slot}')" style="background:#FFFFFF;border:1px solid #CBD5E1;color:#334155;padding:0.45rem 0.65rem;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;" title="Change meeting date or time">
                      🔄 Reschedule
                    </button>
                    
                    <button class="btn btn-sm" onclick="window.editAppointmentNotes(${a.id}, '${(a.admin_notes || '').replace(/'/g, "\\'")}')" style="background:#FFFFFF;border:1px solid #CBD5E1;color:#334155;padding:0.45rem 0.65rem;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;" title="Internal technician / survey notes">
                      📝 Notes
                    </button>

                    ${a.status !== 'cancelled' ? `
                      <button class="btn btn-sm" onclick="window.updateAppointmentStatus(${a.id}, 'cancelled')" style="background:#FFF1F2;border:1px solid #FECDD3;color:#BE123C;padding:0.45rem 0.6rem;border-radius:6px;font-size:0.8rem;cursor:pointer;" title="Cancel this consultation">
                        ❌
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // Quick 1-Click Approval
  window.quickApproveBooking = async function (id) {
    try {
      const res = await adminFetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' })
      });
      if (res.ok) {
        showToast('Booking approved successfully! (बुकिंग स्वीकृत)', 'success');
        await loadAndDisplayAppointments();
      }
    } catch {
      showToast('Failed to approve booking', 'error');
    }
  };

  // Background Auto-Polling (checks for new public bookings every 20 seconds)
  let lastKnownCount = 0;
  setInterval(async () => {
    if (!adminState.token) return;
    try {
      const res = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${adminState.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.appointments) {
          if (lastKnownCount > 0 && data.appointments.length > lastKnownCount) {
            const newest = data.appointments[0];
            showToast(`🔔 New booking from ${newest.full_name}! (नई बुकिंग प्राप्त हुई)`, 'success');
            adminState.appointments = data.appointments;
            updateAppointmentCounts(data.appointments);
            window.filterAppointmentsLive();
          }
          lastKnownCount = data.appointments.length;
        }
      }
    } catch {}
  }, 20000);

  // Assign or Edit Meeting Link Modal
  window.openAssignMeetModal = function (id, currentLink) {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    content.innerHTML = `
      <div style="background:#FFFFFF;color:#0F172A;">
        <h3 style="font-size:1.35rem;font-weight:800;color:#0B1628;margin-bottom:0.4rem;">Assign Google Meet Room</h3>
        <p style="color:#64748B;font-size:0.875rem;margin-bottom:1.25rem;">The Google Meet video link will be saved and privately available for this consultation.</p>
        
        <div class="form-group" style="margin-bottom:1.25rem;">
          <label style="display:block;font-weight:700;color:#334155;font-size:0.85rem;margin-bottom:0.4rem;">Google Meet URL</label>
          <input type="url" id="meet-url-input" class="form-input" placeholder="https://meet.google.com/xxx-yyyy-zzz" value="${currentLink || ''}" style="width:100%;padding:0.75rem 1rem;border:1.5px solid #CBD5E1;border-radius:8px;font-size:0.95rem;box-sizing:border-box;">
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.5rem;flex-wrap:wrap;gap:0.75rem;">
          <button type="button" class="btn btn-sm" onclick="window.autoGenerateMeet(${id})" style="background:#0284C7;color:#FFFFFF;border:none;padding:0.6rem 1rem;border-radius:8px;font-weight:700;cursor:pointer;">
            ⚡ Auto-Generate Google Meet Room
          </button>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="window.closeModal()" style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:0.6rem 1rem;border-radius:8px;font-weight:600;cursor:pointer;">Cancel</button>
            <button class="btn btn-primary btn-sm" onclick="window.saveMeetLink(${id})" style="background:#16845B;color:#FFFFFF;border:none;padding:0.6rem 1.15rem;border-radius:8px;font-weight:700;cursor:pointer;">Save Link</button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
    modal.style.display = 'flex';
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

  // Reschedule Appointment Modal (Clean & Beginner-Friendly)
  window.openRescheduleModal = async function (id, currentDate, currentSlot) {
    const modal = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    content.innerHTML = `
      <div style="background:#FFFFFF;color:#0F172A;">
        <h3 style="font-size:1.35rem;font-weight:800;color:#0B1628;margin-bottom:0.4rem;">Reschedule Online Consultation</h3>
        <p style="color:#64748B;font-size:0.875rem;margin-bottom:1.25rem;">Current schedule: 📅 ${currentDate} (${currentSlot})</p>

        <form id="reschedule-form" onsubmit="window.handleRescheduleSubmit(event, ${id})">
          <div class="form-group" style="margin-bottom:1.25rem;">
            <label style="display:block;font-weight:700;color:#334155;font-size:0.85rem;margin-bottom:0.4rem;">New Consultation Date <span class="required">*</span></label>
            <input type="date" id="reschedule-date" class="form-input" required min="${minDate}" value="${currentDate}" onchange="window.loadRescheduleSlots(this.value)" style="width:100%;padding:0.75rem 1rem;border:1.5px solid #CBD5E1;border-radius:8px;font-size:0.95rem;box-sizing:border-box;">
          </div>

          <div class="form-group" style="margin-bottom:1.5rem;">
            <label style="display:block;font-weight:700;color:#334155;font-size:0.85rem;margin-bottom:0.4rem;">Select New Available Slot <span class="required">*</span></label>
            <div id="reschedule-slots-container">
              <span style="font-size:0.85rem;color:#64748B;">Checking slot availability...</span>
            </div>
          </div>

          <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.closeModal()" style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:0.6rem 1rem;border-radius:8px;font-weight:600;cursor:pointer;">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" style="background:#0284C7;color:#FFFFFF;border:none;padding:0.6rem 1.15rem;border-radius:8px;font-weight:700;cursor:pointer;">Confirm Reschedule</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add('active');
    modal.style.display = 'flex';
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
        container.innerHTML = '<span style="color:#EF4444;font-size:0.85rem;font-weight:600;">No slots available for this date.</span>';
        return;
      }

      container.innerHTML = `
        <select id="reschedule-slot-select" class="form-select" required style="width:100%;padding:0.75rem 1rem;border:1.5px solid #CBD5E1;border-radius:8px;font-size:0.95rem;box-sizing:border-box;">
          ${slots.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      `;
    } catch {
      container.innerHTML = '<span style="color:#EF4444;font-size:0.85rem;">Error loading slots</span>';
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
      <div style="background:#FFFFFF;color:#0F172A;">
        <h3 style="font-size:1.35rem;font-weight:800;color:#0B1628;margin-bottom:0.4rem;">Consultation &amp; Customer Notes</h3>
        <p style="color:#64748B;font-size:0.85rem;margin-bottom:1.25rem;">Record rooftop inspection details, shadow analysis notes, or quotation status</p>
        <textarea id="apt-note-text" class="form-textarea" rows="4" style="width:100%;padding:0.75rem 1rem;border:1.5px solid #CBD5E1;border-radius:8px;font-size:0.95rem;box-sizing:border-box;margin-bottom:1.25rem;">${currentNotes || ''}</textarea>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button class="btn btn-secondary btn-sm" style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:0.6rem 1rem;border-radius:8px;font-weight:600;cursor:pointer;" onclick="window.closeModal()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="window.saveAppointmentNote(${id})" style="background:#16845B;color:#FFFFFF;border:none;padding:0.6rem 1.15rem;border-radius:8px;font-weight:700;cursor:pointer;">Save Notes</button>
        </div>
      </div>
    `;

    modal.classList.add('active');
    modal.style.display = 'flex';
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
        loadAndDisplayAppointments();
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
      <div style="background:#FFFFFF;color:#0F172A;">
        <h3 style="font-size:1.35rem;font-weight:800;color:#0B1628;margin-bottom:0.4rem;">Block Date or Time Slot</h3>
        <p style="color:#64748B;font-size:0.85rem;margin-bottom:1.25rem;">Prevent customers from reserving specific dates or slots (e.g. holidays, site audit days)</p>
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
    modal.style.display = 'flex';
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
    modal.style.display = 'flex';
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

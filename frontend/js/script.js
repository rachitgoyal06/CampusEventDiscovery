// Campus Event Discovery System
// Complete frontend controller synced with Supabase Database and Java Backend

const SUPABASE_URL = "https://ueaxokgriaobucaafuyi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlYXhva2dyaWFvYnVjYWFmdXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0OTYwNjIsImV4cCI6MjEwNjA3MjA2Mn0.oFp78Vrqz-6aZJYY_3FuWY_O2q-z1CY359zBjerMYNg";

const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

let allEvents = [];
let userRegisteredEventIds = new Set();
let currentUser = null;

try {
    currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
} catch (e) {
    currentUser = null;
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    fetchEvents();
    if (currentUser) {
        fetchRegistrations();
    } else {
        updateRegistrationCount(0);
    }

    // Keyboard shortcut: close modal on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
});

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${icons[type] || '🔔'} ${escapeHtml(message)}</span>
        <button style="background:none; border:none; color:#aaa; font-size:16px; cursor:pointer; margin-left:12px;" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 400);
        }
    }, 3500);
}

// ==========================================
// AUTHENTICATION UI
// ==========================================
function updateAuthUI() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    // Check if authBtn exists, if not recreate
    let authArea = document.getElementById('userNavArea');
    if (!authArea) {
        authArea = document.createElement('div');
        authArea.id = 'userNavArea';
        authArea.style.display = 'inline-flex';
        authArea.style.alignItems = 'center';
        authArea.style.gap = '10px';
        navLinks.appendChild(authArea);
    }

    // Hide original static buttons if present
    const oldAuthBtn = document.getElementById('authBtn');
    if (oldAuthBtn) oldAuthBtn.remove();
    const oldAdminBtn = document.querySelector('.admin-btn');
    if (oldAdminBtn) oldAdminBtn.remove();

    if (currentUser) {
        const isAdmin = currentUser.role === 'ADMIN';
        authArea.innerHTML = `
            <div class="user-chip">
                <span>👤 <strong>${escapeHtml(currentUser.name)}</strong></span>
                <span class="user-role-badge ${isAdmin ? 'role-admin' : 'role-student'}">${currentUser.role}</span>
            </div>
            ${isAdmin ? `<button class="admin-btn" style="background:#7165ff; border-color:#7165ff;" onclick="openAdmin()">+ Add Event</button>` : ''}
            <button class="admin-btn" onclick="logout()">Logout</button>
        `;
    } else {
        authArea.innerHTML = `
            <button class="admin-btn" onclick="openLogin()">Login</button>
            <button class="admin-btn" style="background:#262a38;" onclick="openSignUp()">Sign Up</button>
            <button class="admin-btn" onclick="openAdmin()">Admin</button>
        `;
    }
}

// ==========================================
// FETCH EVENTS
// ==========================================
async function fetchEvents() {
    const container = document.getElementById('eventContainer');
    if (container && allEvents.length === 0) {
        container.innerHTML = '<div class="empty-message">Loading upcoming events from Supabase...</div>';
    }

    try {
        let res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=event_date.asc`, { headers });
        if (!res.ok) {
            // Local backend fallback
            res = await fetch('/api/events');
        }

        if (!res.ok) throw new Error('Could not fetch events');
        allEvents = await res.json();

        // Update statistics
        const countElem = document.getElementById('eventCount');
        if (countElem) countElem.textContent = allEvents.length;

        displayEvents();
    } catch (err) {
        console.error('Error fetching events:', err);
        if (container) {
            container.innerHTML = `<div class="empty-message" style="color:#ff6b6b;">Failed to load events: ${err.message}. Please check connection.</div>`;
        }
    }
}

// Categorize event helper
function getEventCategory(ev) {
    const text = `${ev.event_name} ${ev.description} ${ev.organizer}`.toLowerCase();
    if (text.includes('sport') || text.includes('cricket') || text.includes('football') || text.includes('tournament')) {
        return 'Sports';
    }
    if (text.includes('workshop') || text.includes('hands-on') || text.includes('bootcamp') || text.includes('training')) {
        return 'Workshop';
    }
    if (text.includes('cultural') || text.includes('music') || text.includes('dance') || text.includes('drama') || text.includes('fest')) {
        return 'Cultural';
    }
    return 'Technical';
}

function getCategoryEmoji(category) {
    switch (category) {
        case 'Technical': return '💻';
        case 'Sports': return '🏆';
        case 'Cultural': return '🎭';
        case 'Workshop': return '🛠️';
        default: return '🎉';
    }
}

// ==========================================
// RENDER EVENTS
// ==========================================
function displayEvents() {
    const container = document.getElementById('eventContainer');
    if (!container) return;

    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const selectedCategory = document.getElementById('categoryFilter')?.value || 'all';

    const filtered = allEvents.filter(ev => {
        const category = getEventCategory(ev);
        const title = (ev.event_name || '').toLowerCase();
        const desc = (ev.description || '').toLowerCase();
        const org = (ev.organizer || '').toLowerCase();
        const venue = (ev.venue || '').toLowerCase();

        const matchesSearch = title.includes(searchTerm) || desc.includes(searchTerm) || org.includes(searchTerm) || venue.includes(searchTerm);
        const matchesCategory = (selectedCategory === 'all') || (category.toLowerCase() === selectedCategory.toLowerCase());

        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-message">No upcoming events found matching your search.</div>';
        return;
    }

    container.innerHTML = filtered.map(ev => {
        const category = getEventCategory(ev);
        const emoji = getCategoryEmoji(category);
        const isRegistered = userRegisteredEventIds.has(ev.event_id);
        const isAdmin = currentUser && currentUser.role === 'ADMIN';

        return `
            <div class="event-card">
                <div class="event-image">${emoji}</div>
                <div class="event-content">
                    <span class="event-category badge-${category}">${category} • ${escapeHtml(ev.organizer || 'Campus')}</span>
                    <h3>${escapeHtml(ev.event_name)}</h3>
                    <p class="event-info">📅 <strong>Date:</strong> ${ev.event_date ? ev.event_date : 'To Be Announced'}</p>
                    <p class="event-info">📍 <strong>Venue:</strong> ${escapeHtml(ev.venue || 'To BE Announced')}</p>
                    <p class="event-info">👥 <strong>Capacity:</strong> ${ev.capacity || 200}</p>
                    <p style="color:#9da0ad; margin:10px 0 14px; font-size:13px; min-height:38px; line-height:1.4;">
                        ${escapeHtml(ev.description || 'No additional description provided.')}
                    </p>

                    <div class="event-buttons">
                        <button onclick="viewEventDetails(${ev.event_id})">Details</button>
                        
                        ${isRegistered ? `
                            <button class="registered-button" onclick="cancelRegistration(${ev.event_id})">
                                ✓ Registered
                            </button>
                        ` : `
                            <button class="register-button" onclick="registerEvent(${ev.event_id})">
                                Register
                            </button>
                        `}

                        ${isAdmin ? `
                            <button class="delete-button" onclick="deleteEvent(${ev.event_id})">
                                Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// EVENT DETAILS MODAL
// ==========================================
function viewEventDetails(eventId) {
    const ev = allEvents.find(e => e.event_id === eventId);
    if (!ev) return;

    const category = getEventCategory(ev);
    const emoji = getCategoryEmoji(category);
    const isRegistered = userRegisteredEventIds.has(ev.event_id);

    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <div style="text-align:center; margin-bottom:18px;">
            <div style="font-size:52px; margin-bottom:8px;">${emoji}</div>
            <span class="event-category badge-${category}" style="margin-bottom:10px;">${category}</span>
            <h2 style="color:#ffffff; font-size:24px; margin-top:6px;">${escapeHtml(ev.event_name)}</h2>
        </div>

        <div style="background:#0f1117; padding:16px; border-radius:12px; border:1px solid #282b35; margin-bottom:18px;">
            <p style="color:#858894; font-size:14px; line-height:1.6; margin-bottom:12px;">
                ${escapeHtml(ev.description || 'No description available for this event.')}
            </p>
            <p class="event-info">📅 <strong>Date:</strong> ${ev.event_date ? ev.event_date : 'To Be Announced'}</p>
            <p class="event-info">📍 <strong>Venue:</strong> ${escapeHtml(ev.venue || 'To BE Announced')}</p>
            <p class="event-info">🏛️ <strong>Organizer:</strong> ${escapeHtml(ev.organizer || 'Campus Team')}</p>
            <p class="event-info">👥 <strong>Capacity:</strong> ${ev.capacity || 200} participants</p>
        </div>

        <div>
            ${isRegistered ? `
                <button class="submit-button" style="background:#1a3328; color:#4ade80; border:1px solid #22c55e;" onclick="cancelRegistration(${ev.event_id}); closeModal();">
                    ✓ You are registered (Click to Cancel)
                </button>
            ` : `
                <button class="submit-button" onclick="registerEvent(${ev.event_id}); closeModal();">
                    Register for this Event
                </button>
            `}
        </div>
    `;

    modal.classList.remove('hidden');
}

// ==========================================
// EVENT REGISTRATION
// ==========================================
async function registerEvent(eventId) {
    if (!currentUser) {
        showToast('Please log in first to register for events', 'info');
        openLogin();
        return;
    }

    if (userRegisteredEventIds.has(eventId)) {
        showToast('You are already registered for this event!', 'warning');
        return;
    }

    try {
        const payload = [{
            user_id: currentUser.user_id,
            event_id: eventId,
            registration_date: new Date().toISOString().split('T')[0]
        }];

        const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations`, {
            method: 'POST',
            headers: {
                ...headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            userRegisteredEventIds.add(eventId);
            showToast('🎉 Successfully registered for the event!', 'success');
            displayEvents();
            fetchRegistrations();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.message || 'Registration failed', 'error');
        }
    } catch (err) {
        console.error('Registration error:', err);
        showToast('Registration request failed', 'error');
    }
}

// Fetch user registrations
async function fetchRegistrations() {
    const container = document.getElementById('registrationContainer');

    if (!currentUser) {
        if (container) {
            container.innerHTML = '<div class="empty-message">Please log in to view your registered events.</div>';
        }
        updateRegistrationCount(0);
        return;
    }

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*,events(*)&user_id=eq.${currentUser.user_id}&order=registration_date.desc`, { headers });
        if (!res.ok) throw new Error('Could not fetch registrations');
        const list = await res.json();

        userRegisteredEventIds = new Set(list.map(r => r.event_id));
        updateRegistrationCount(list.length);
        displayEvents();

        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = '<div class="empty-message">You have not registered for any events yet. Explore events above and click Register!</div>';
            return;
        }

        container.innerHTML = list.map(r => {
            const ev = r.events || {};
            return `
                <div class="registration-item">
                    <div>
                        <strong style="font-size:16px;">${escapeHtml(ev.event_name || 'Event #' + r.event_id)}</strong><br>
                        <small style="color:#858894; display:block; margin-top:4px;">
                            📅 Event Date: <strong>${ev.event_date ? ev.event_date : 'To Be Announced'}</strong> | 📍 Venue: <strong>${escapeHtml(ev.venue || 'TBA')}</strong> | 📝 Registered on: ${r.registration_date}
                        </small>
                    </div>
                    <button class="cancel-button" onclick="cancelRegistration(${r.event_id})">Cancel Registration</button>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error fetching registrations:', err);
    }
}

// Cancel registration
async function cancelRegistration(eventId) {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to cancel this event registration?')) return;

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?user_id=eq.${currentUser.user_id}&event_id=eq.${eventId}`, {
            method: 'DELETE',
            headers
        });

        if (res.ok) {
            userRegisteredEventIds.delete(eventId);
            showToast('Registration cancelled successfully', 'info');
            displayEvents();
            fetchRegistrations();
        } else {
            showToast('Could not cancel registration', 'error');
        }
    } catch (err) {
        console.error('Cancel registration error:', err);
        showToast('Error cancelling registration', 'error');
    }
}

function updateRegistrationCount(count) {
    const countElem = document.getElementById('registrationCount');
    if (countElem) countElem.textContent = count;
}

// ==========================================
// ADMIN MANAGEMENT
// ==========================================
function openAdmin() {
    if (!currentUser || currentUser.role !== 'ADMIN') {
        showToast('Admin privileges required. Please login with an admin account.', 'warning');
        openLogin();
        return;
    }

    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <h2 style="margin-bottom:15px; color:#ffffff;">Add New Event</h2>
        <div id="modalFormError" class="form-error hidden"></div>
        <form onsubmit="submitNewEvent(event)">
            <label style="color:#aaa; font-size:12px;">Event Name</label>
            <input type="text" id="newEventName" placeholder="e.g. AI Hackathon 2026" required>

            <label style="color:#aaa; font-size:12px;">Category</label>
            <select id="newEventCategory" style="width:100%; padding:12px; margin:7px 0 15px; border:1px solid #30333d; border-radius:8px; background-color:#0f1116; color:#ffffff;">
                <option value="Technical">Technical</option>
                <option value="Cultural">Cultural</option>
                <option value="Sports">Sports</option>
                <option value="Workshop">Workshop</option>
            </select>

            <label style="color:#aaa; font-size:12px;">Description</label>
            <input type="text" id="newEventDesc" placeholder="e.g. 24-hour hackathon with exciting prizes" required>

            <label style="color:#aaa; font-size:12px;">Event Date</label>
            <input type="date" id="newEventDate" required>

            <label style="color:#aaa; font-size:12px;">Venue</label>
            <input type="text" id="newEventVenue" placeholder="e.g. AB1 Auditorium / Online" required>

            <label style="color:#aaa; font-size:12px;">Organizer</label>
            <input type="text" id="newEventOrg" placeholder="e.g. IEEE CIS MUJ" required>

            <label style="color:#aaa; font-size:12px;">Capacity</label>
            <input type="number" id="newEventCap" placeholder="e.g. 250" value="200" required>

            <button type="submit" class="submit-button" style="margin-top:10px;">Create Event</button>
        </form>
    `;

    modal.classList.remove('hidden');
}

async function submitNewEvent(e) {
    e.preventDefault();
    const eventName = document.getElementById('newEventName').value.trim();
    const category = document.getElementById('newEventCategory').value;
    const desc = document.getElementById('newEventDesc').value.trim();
    const date = document.getElementById('newEventDate').value;
    const venue = document.getElementById('newEventVenue').value.trim();
    const organizer = document.getElementById('newEventOrg').value.trim();
    const cap = parseInt(document.getElementById('newEventCap').value) || 200;

    const payload = [{
        event_name: eventName,
        description: `[${category}] ${desc}`,
        event_date: date,
        venue: venue,
        organizer: organizer,
        capacity: cap
    }];

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
            method: 'POST',
            headers: {
                ...headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast('Event created successfully! 🎉', 'success');
            closeModal();
            fetchEvents();
        } else {
            const err = await res.json().catch(() => ({}));
            showModalError(err.message || 'Failed to create event');
        }
    } catch (err) {
        console.error('Error creating event:', err);
        showModalError('Error creating event');
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to permanently delete this event?')) return;

    try {
        // First delete any registrations associated with this event
        await fetch(`${SUPABASE_URL}/rest/v1/registrations?event_id=eq.${eventId}`, {
            method: 'DELETE',
            headers
        });

        const res = await fetch(`${SUPABASE_URL}/rest/v1/events?event_id=eq.${eventId}`, {
            method: 'DELETE',
            headers
        });

        if (res.ok) {
            showToast('Event deleted successfully', 'warning');
            fetchEvents();
            if (currentUser) fetchRegistrations();
        } else {
            showToast('Error deleting event', 'error');
        }
    } catch (err) {
        console.error('Delete event error:', err);
        showToast('Error deleting event', 'error');
    }
}

// ==========================================
// LOGIN & SIGN UP MODALS
// ==========================================
function openLogin(prefillEmail = '') {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <h2 style="margin-bottom:15px; color:#ffffff;">Account Login</h2>
        <div id="modalFormError" class="form-error hidden"></div>
        <form onsubmit="submitLogin(event)">
            <label style="color:#aaa; font-size:12px;">Email Address</label>
            <input type="email" id="loginEmail" placeholder="your.name@muj.manipal.edu" value="${escapeHtml(prefillEmail)}" required>

            <label style="color:#aaa; font-size:12px;">Password</label>
            <input type="password" id="loginPassword" placeholder="••••••••" required>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; margin-bottom:14px; font-size:12px;">
                <a href="javascript:void(0)" onclick="openForgotPassword(document.getElementById('loginEmail')?.value || '')" style="color:#a39aff; text-decoration:none;">Forgot Password?</a>
                <a href="javascript:void(0)" onclick="openSignUp()" style="color:#7165ff; text-decoration:none; font-weight:bold;">Create account</a>
            </div>

            <button type="submit" class="submit-button">Sign In</button>
            <p style="margin-top:16px; font-size:13px; color:#858894; text-align:center;">
                New to Campus Events? 
                <a href="javascript:void(0)" onclick="openSignUp()" style="color:#7165ff; font-weight:bold;">Create an account</a>
            </p>
        </form>
    `;

    modal.classList.remove('hidden');
}

// ==========================================
// FORGOT PASSWORD MODAL
// ==========================================
function openForgotPassword(prefillEmail = '') {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <h2 style="margin-bottom:10px; color:#ffffff;">Reset Password</h2>
        <p style="color:#858894; font-size:13px; margin-bottom:16px; line-height:1.4;">
            Enter your registered email address and choose your new password.
        </p>
        <div id="modalFormError" class="form-error hidden"></div>
        <form onsubmit="submitForgotPassword(event)">
            <label style="color:#aaa; font-size:12px;">Registered Email Address</label>
            <input type="email" id="forgotEmail" placeholder="e.g. your.email@muj.manipal.edu" value="${escapeHtml(prefillEmail)}" required>

            <label style="color:#aaa; font-size:12px;">New Password</label>
            <input type="password" id="forgotNewPass" placeholder="••••••••" required>

            <label style="color:#aaa; font-size:12px;">Confirm New Password</label>
            <input type="password" id="forgotConfirmPass" placeholder="••••••••" required>

            <button type="submit" class="submit-button" style="margin-top:8px;">Reset Password</button>
            <p style="margin-top:16px; font-size:13px; color:#858894; text-align:center;">
                Remembered your password? 
                <a href="javascript:void(0)" onclick="openLogin(document.getElementById('forgotEmail')?.value || '')" style="color:#7165ff; font-weight:bold;">Back to Login</a>
            </p>
        </form>
    `;

    modal.classList.remove('hidden');
}

async function submitForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    const newPass = document.getElementById('forgotNewPass').value.trim();
    const confirmPass = document.getElementById('forgotConfirmPass').value.trim();

    if (newPass !== confirmPass) {
        showModalError('Passwords do not match. Please verify your new password.');
        return;
    }

    if (newPass.length < 4) {
        showModalError('Password must be at least 4 characters long.');
        return;
    }

    try {
        // Check if user exists in Supabase
        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=user_id,name`, { headers });
        const users = await checkRes.json();

        if (!users || users.length === 0) {
            showModalError('No registered account was found with this email address.');
            return;
        }

        // Update password in Supabase
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
            method: 'PATCH',
            headers: {
                ...headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ password: newPass })
        });

        // Also notify local backend if available
        fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, new_password: newPass })
        }).catch(() => {});

        if (patchRes.ok) {
            showToast('Password reset successfully! 🎉 Please sign in.', 'success');
            openLogin(email);
        } else {
            const err = await patchRes.json().catch(() => ({}));
            showModalError(err.message || 'Failed to reset password. Please try again.');
        }
    } catch (err) {
        console.error('Password reset error:', err);
        showModalError('Network error while resetting password. Please check your connection.');
    }
}

function openSignUp() {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <h2 style="margin-bottom:15px; color:#ffffff;">Student Registration</h2>
        <div id="modalFormError" class="form-error hidden"></div>
        <form onsubmit="submitSignUp(event)">
            <label style="color:#aaa; font-size:12px;">Full Name</label>
            <input type="text" id="regName" placeholder="e.g. John Doe" required>

            <label style="color:#aaa; font-size:12px;">University Email (@muj.manipal.edu)</label>
            <input type="email" id="regEmail" placeholder="e.g. john.2502052500@muj.manipal.edu" required>

            <label style="color:#aaa; font-size:12px;">Password</label>
            <input type="password" id="regPass" placeholder="••••••••" required>

            <label style="color:#aaa; font-size:12px;">Confirm Password</label>
            <input type="password" id="regConfirmPass" placeholder="••••••••" required>

            <button type="submit" class="submit-button" style="margin-top:8px;">Register Account</button>
            <p style="margin-top:16px; font-size:13px; color:#858894; text-align:center;">
                Already have an account? 
                <a href="javascript:void(0)" onclick="openLogin()" style="color:#7165ff; font-weight:bold;">Log In</a>
            </p>
        </form>
    `;

    modal.classList.remove('hidden');
}

async function submitLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}&select=*`, { headers });
        const users = await res.json();

        if (res.ok && users && users.length > 0) {
            currentUser = users[0];
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast(`Welcome back, ${currentUser.name}! 👋`, 'success');
            closeModal();
            updateAuthUI();
            fetchRegistrations();
        } else {
            showModalError('Invalid email or password. Please check your credentials.');
        }
    } catch (err) {
        console.error('Login error:', err);
        showModalError('Login failed. Please check network connection.');
    }
}

async function submitSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value.trim();
    const confirm = document.getElementById('regConfirmPass').value.trim();

    if (pass !== confirm) {
        showModalError('Passwords do not match!');
        return;
    }
    if (!email.toLowerCase().endsWith('@muj.manipal.edu')) {
        showModalError('Please enter a valid university email ending with @muj.manipal.edu');
        return;
    }

    try {
        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=user_id`, { headers });
        const existing = await checkRes.json();
        if (existing && existing.length > 0) {
            showModalError('An account with this email already exists. Please login.');
            return;
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
                ...headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify([{
                name,
                email,
                password: pass,
                role: 'STUDENT'
            }])
        });

        if (res.ok) {
            showToast('Account created successfully! 🎉 Please sign in.', 'success');
            openLogin();
        } else {
            const err = await res.json().catch(() => ({}));
            showModalError(err.message || 'Sign up failed');
        }
    } catch (err) {
        console.error('Sign up error:', err);
        showModalError('Network error during registration');
    }
}

function logout() {
    currentUser = null;
    userRegisteredEventIds.clear();
    localStorage.removeItem('currentUser');
    updateAuthUI();
    displayEvents();
    fetchRegistrations();
    showToast('Logged out successfully', 'info');
}

// ==========================================
// MODAL HELPERS
// ==========================================
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('hidden');
}

function handleBackdropClick(e) {
    if (e.target && e.target.id === 'modal') {
        closeModal();
    }
}

function showModalError(msg) {
    const errorBox = document.getElementById('modalFormError');
    if (errorBox) {
        errorBox.textContent = msg;
        errorBox.classList.remove('hidden');
    } else {
        showToast(msg, 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

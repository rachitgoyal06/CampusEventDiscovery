// Campus Event Discovery - Frontend Controller
// Connects directly to Supabase REST API & optional Java backend

const SUPABASE_URL = "https://ueaxokgriaobucaafuyi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlYXhva2dyaWFvYnVjYWFmdXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0OTYwNjIsImV4cCI6MjEwNjA3MjA2Mn0.oFp78Vrqz-6aZJYY_3FuWY_O2q-z1CY359zBjerMYNg";

const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

let allEvents = [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    fetchEvents();
    if (currentUser) {
        fetchRegistrations();
    }
});

// Update Auth Button State
function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    if (!authBtn) return;
    if (currentUser) {
        authBtn.textContent = `${currentUser.name} (Logout)`;
        authBtn.onclick = logout;
    } else {
        authBtn.textContent = 'Login';
        authBtn.onclick = openLogin;
    }
}

// Fetch all events (direct Supabase query with fallback to local backend)
async function fetchEvents() {
    const container = document.getElementById('eventContainer');
    if (container) {
        container.innerHTML = '<div class="empty-message">Loading upcoming events from Supabase...</div>';
    }

    try {
        // Direct Supabase query
        let res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=event_date.asc`, { headers });
        if (!res.ok) {
            // Fallback to local Java API if available
            res = await fetch('/api/events');
        }

        if (!res.ok) throw new Error('Failed to load events from Supabase or Backend');
        allEvents = await res.json();

        // Update stats
        const countElem = document.getElementById('eventCount');
        if (countElem) countElem.textContent = allEvents.length;

        displayEvents();
    } catch (err) {
        console.error('Error fetching events:', err);
        if (container) {
            container.innerHTML = `<div class="empty-message" style="color:#ff6b6b;">Error loading events: ${err.message}. Please check your connection.</div>`;
        }
    }
}

// Filter and render events
function displayEvents() {
    const container = document.getElementById('eventContainer');
    if (!container) return;

    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const category = document.getElementById('categoryFilter')?.value || 'all';

    const filtered = allEvents.filter(ev => {
        const title = (ev.event_name || '').toLowerCase();
        const desc = (ev.description || '').toLowerCase();
        const org = (ev.organizer || '').toLowerCase();

        const matchesSearch = title.includes(searchTerm) || desc.includes(searchTerm) || org.includes(searchTerm);
        const matchesCategory = (category === 'all') ||
                                desc.includes(category.toLowerCase()) ||
                                title.includes(category.toLowerCase()) ||
                                org.includes(category.toLowerCase());
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-message">No upcoming events found matching your criteria.</div>';
        return;
    }

    container.innerHTML = filtered.map(ev => `
        <div class="event-card">
            <div class="event-image">🎉</div>
            <div class="event-content">
                <span class="event-category">${escapeHtml(ev.organizer || 'Event')}</span>
                <h3>${escapeHtml(ev.event_name)}</h3>
                <p class="event-info">📅 <strong>Date:</strong> ${ev.event_date}</p>
                <p class="event-info">📍 <strong>Venue:</strong> ${escapeHtml(ev.venue || 'To BE Announced')}</p>
                <p class="event-info">👥 <strong>Capacity:</strong> ${ev.capacity}</p>
                <p style="color:#b5b7c0; margin-top:8px; font-size:14px; min-height:40px;">${escapeHtml(ev.description || '')}</p>
                <div class="event-buttons">
                    <button class="register-button" onclick="registerEvent(${ev.event_id})">Register</button>
                    ${currentUser && currentUser.role === 'ADMIN' ? 
                        `<button style="background:#ff4b4b; border-color:#ff4b4b;" onclick="deleteEvent(${ev.event_id})">Delete</button>` 
                        : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Register for an event
async function registerEvent(eventId) {
    if (!currentUser) {
        alert('Please login first to register for events.');
        openLogin();
        return;
    }

    try {
        // Direct Supabase insert
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations`, {
            method: 'POST',
            headers: {
                ...headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify([{
                user_id: currentUser.user_id,
                event_id: eventId,
                registration_date: new Date().toISOString().split('T')[0]
            }])
        });

        if (res.ok) {
            alert('🎉 Registration successful!');
            fetchRegistrations();
        } else {
            const data = await res.json().catch(() => ({}));
            alert('Registration error: ' + (data.message || 'Could not register'));
        }
    } catch (err) {
        console.error('Registration failed:', err);
        alert('Registration request failed.');
    }
}

// Fetch user registrations
async function fetchRegistrations() {
    const container = document.getElementById('registrationContainer');
    if (!currentUser) {
        if (container) {
            container.innerHTML = '<div class="empty-message">Please log in to see your registered events.</div>';
        }
        return;
    }

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*,events(*)&user_id=eq.${currentUser.user_id}&order=registration_date.desc`, { headers });
        if (!res.ok) throw new Error('Failed to load registrations');
        const list = await res.json();

        const regCount = document.getElementById('registrationCount');
        if (regCount) regCount.textContent = list.length;

        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = '<div class="empty-message">You have not registered for any events yet.</div>';
            return;
        }

        container.innerHTML = list.map(r => {
            const eventInfo = r.events || {};
            return `
                <div class="registration-item">
                    <div>
                        <strong>${escapeHtml(eventInfo.event_name || 'Event #' + r.event_id)}</strong><br>
                        <small>📅 Event Date: ${eventInfo.event_date || 'N/A'} | 📍 ${escapeHtml(eventInfo.venue || 'TBA')} | Registered: ${r.registration_date}</small>
                    </div>
                    <button class="cancel-button" onclick="cancelRegistration(${r.event_id})">Cancel</button>
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
    if (!confirm('Are you sure you want to cancel this registration?')) return;

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?user_id=eq.${currentUser.user_id}&event_id=eq.${eventId}`, {
            method: 'DELETE',
            headers
        });
        if (res.ok) {
            alert('Registration cancelled.');
            fetchRegistrations();
        } else {
            alert('Could not cancel registration.');
        }
    } catch (err) {
        console.error('Cancel failed:', err);
    }
}

// Admin / Event Management
function openAdmin() {
    if (!currentUser || currentUser.role !== 'ADMIN') {
        alert('Admin privileges required. Please log in with an Admin account.');
        openLogin();
        return;
    }

    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
        <h2 style="margin-bottom:15px; color:#ffffff;">Add New Event</h2>
        <form onsubmit="submitNewEvent(event)">
            <input type="text" id="newEventName" placeholder="Event Name" required>
            <input type="text" id="newEventDesc" placeholder="Description" required>
            <input type="date" id="newEventDate" required>
            <input type="text" id="newEventVenue" placeholder="Venue" required>
            <input type="text" id="newEventOrg" placeholder="Organizer (e.g. IEEE CIS MUJ)" required>
            <input type="number" id="newEventCap" placeholder="Capacity (e.g. 200)" required>
            <button type="submit" class="submit-button" style="margin-top:10px;">Create Event</button>
        </form>
    `;
    modal.classList.remove('hidden');
}

async function submitNewEvent(e) {
    e.preventDefault();
    const eventObj = [{
        event_name: document.getElementById('newEventName').value,
        description: document.getElementById('newEventDesc').value,
        event_date: document.getElementById('newEventDate').value,
        venue: document.getElementById('newEventVenue').value,
        organizer: document.getElementById('newEventOrg').value,
        capacity: parseInt(document.getElementById('newEventCap').value) || 100
    }];

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
            method: 'POST',
            headers: {
                ...headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(eventObj)
        });
        if (res.ok) {
            alert('Event added successfully!');
            closeModal();
            fetchEvents();
        } else {
            const errData = await res.json().catch(() => ({}));
            alert('Failed to add event: ' + (errData.message || 'Error'));
        }
    } catch (err) {
        console.error('Failed to add event', err);
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/events?event_id=eq.${eventId}`, {
            method: 'DELETE',
            headers
        });
        if (res.ok) {
            alert('Event deleted.');
            fetchEvents();
        } else {
            alert('Error deleting event');
        }
    } catch (err) {
        console.error(err);
    }
}

// Login & Signup Modals
function openLogin() {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
        <h2 style="margin-bottom:15px; color:#ffffff;">Login</h2>
        <form onsubmit="submitLogin(event)">
            <input type="email" id="loginEmail" placeholder="Your Email" required>
            <input type="password" id="loginPassword" placeholder="Password" required>
            <button type="submit" class="submit-button">Login</button>
            <p style="margin-top:15px; font-size:13px; color:#858894; text-align:center;">
                Don't have an account? 
                <a href="javascript:void(0)" onclick="openSignUp()" style="color:#7165ff;">Sign Up</a>
            </p>
        </form>
    `;
    modal.classList.remove('hidden');
}

function openSignUp() {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
        <h2 style="margin-bottom:15px; color:#ffffff;">Student Sign Up</h2>
        <form onsubmit="submitSignUp(event)">
            <input type="text" id="regName" placeholder="Full Name" required>
            <input type="email" id="regEmail" placeholder="MUJ Email (@muj.manipal.edu)" required>
            <input type="password" id="regPass" placeholder="Password" required>
            <input type="password" id="regConfirmPass" placeholder="Confirm Password" required>
            <button type="submit" class="submit-button">Create Account</button>
            <p style="margin-top:15px; font-size:13px; color:#858894; text-align:center;">
                Already registered? 
                <a href="javascript:void(0)" onclick="openLogin()" style="color:#7165ff;">Login</a>
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
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}&select=*`, {
            headers
        });
        const users = await res.json();
        if (res.ok && users && users.length > 0) {
            currentUser = users[0];
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            alert(`Welcome back, ${currentUser.name}!`);
            closeModal();
            updateAuthUI();
            displayEvents();
            fetchRegistrations();
        } else {
            alert('Login failed: Invalid email or password');
        }
    } catch (err) {
        console.error('Login error', err);
        alert('Login failed. Please try again.');
    }
}

async function submitSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value.trim();
    const confirm = document.getElementById('regConfirmPass').value.trim();

    if (pass !== confirm) {
        alert('Passwords do not match!');
        return;
    }
    if (!email.toLowerCase().endsWith("@muj.manipal.edu")) {
        alert('Please use your official @muj.manipal.edu email!');
        return;
    }

    try {
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
            alert('Account created successfully! You can now log in.');
            openLogin();
        } else {
            const errData = await res.json().catch(() => ({}));
            alert('Sign up error: ' + (errData.message || 'Could not create user'));
        }
    } catch (err) {
        console.error('Sign up error', err);
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    displayEvents();
    fetchRegistrations();
    alert('Logged out successfully.');
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('hidden');
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

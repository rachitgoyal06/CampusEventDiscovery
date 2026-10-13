// Frontend interaction with Java Backend & Supabase Database

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

// Fetch all events from Backend
async function fetchEvents() {
    try {
        const res = await fetch('/api/events');
        if (!res.ok) throw new Error('Failed to load events');
        allEvents = await res.json();
        
        // Update stats
        const countElem = document.getElementById('eventCount');
        if (countElem) countElem.textContent = allEvents.length;

        displayEvents();
    } catch (err) {
        console.error('Error fetching events:', err);
    }
}

// Filter and render events
function displayEvents() {
    const container = document.getElementById('eventContainer');
    if (!container) return;

    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const category = document.getElementById('categoryFilter')?.value || 'all';

    const filtered = allEvents.filter(ev => {
        const matchesSearch = ev.event_name.toLowerCase().includes(searchTerm) ||
                              (ev.description && ev.description.toLowerCase().includes(searchTerm));
        const matchesCategory = (category === 'all') || 
                                (ev.description && ev.description.toLowerCase().includes(category.toLowerCase())) ||
                                (ev.event_name && ev.event_name.toLowerCase().includes(category.toLowerCase()));
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
                <p class="event-info">📍 <strong>Venue:</strong> ${escapeHtml(ev.venue || 'TBA')}</p>
                <p class="event-info">👥 <strong>Capacity:</strong> ${ev.capacity}</p>
                <p style="color:#b5b7c0; margin-top:8px; font-size:14px;">${escapeHtml(ev.description || '')}</p>
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
        const res = await fetch('/api/registrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.user_id.toString(),
                event_id: eventId.toString()
            })
        });

        const data = await res.json();
        if (res.ok) {
            alert('🎉 Registration successful!');
            fetchRegistrations();
        } else {
            alert('Error: ' + (data.error || 'Registration failed'));
        }
    } catch (err) {
        console.error('Registration failed:', err);
        alert('Registration request failed.');
    }
}

// Fetch user registrations
async function fetchRegistrations() {
    if (!currentUser) {
        const regContainer = document.getElementById('registrationContainer');
        if (regContainer) {
            regContainer.innerHTML = '<div class="empty-message">Please log in to see your registered events.</div>';
        }
        return;
    }

    try {
        const res = await fetch(`/api/registrations?userId=${currentUser.user_id}`);
        if (!res.ok) throw new Error('Failed to load registrations');
        const list = await res.json();

        const regCount = document.getElementById('registrationCount');
        if (regCount) regCount.textContent = list.length;

        const container = document.getElementById('registrationContainer');
        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = '<div class="empty-message">You have not registered for any events yet.</div>';
            return;
        }

        container.innerHTML = list.map(r => `
            <div class="registration-item">
                <div>
                    <strong>${escapeHtml(r.event_name)}</strong><br>
                    <small>📅 Event Date: ${r.event_date} | 📍 ${escapeHtml(r.venue)} | Registered: ${r.registration_date}</small>
                </div>
                <button class="cancel-button" onclick="cancelRegistration(${r.event_id})">Cancel</button>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error fetching registrations:', err);
    }
}

// Cancel registration
async function cancelRegistration(eventId) {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to cancel this registration?')) return;

    try {
        const res = await fetch(`/api/registrations?userId=${currentUser.user_id}&eventId=${eventId}`, {
            method: 'DELETE'
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
    const eventObj = {
        event_name: document.getElementById('newEventName').value,
        description: document.getElementById('newEventDesc').value,
        event_date: document.getElementById('newEventDate').value,
        venue: document.getElementById('newEventVenue').value,
        organizer: document.getElementById('newEventOrg').value,
        capacity: document.getElementById('newEventCap').value
    };

    try {
        const res = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventObj)
        });
        if (res.ok) {
            alert('Event added successfully!');
            closeModal();
            fetchEvents();
        } else {
            alert('Failed to add event');
        }
    } catch (err) {
        console.error('Failed to add event', err);
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
        const res = await fetch(`/api/events?id=${eventId}`, {
            method: 'DELETE'
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
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            currentUser = data;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            alert(`Welcome back, ${currentUser.name}!`);
            closeModal();
            updateAuthUI();
            displayEvents();
            fetchRegistrations();
        } else {
            alert('Login failed: ' + (data.error || 'Invalid credentials'));
        }
    } catch (err) {
        console.error('Login error', err);
    }
}

async function submitSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;

    if (pass !== confirm) {
        alert('Passwords do not match!');
        return;
    }
    if (!email.toLowerCase().endsWith('@muj.manipal.edu')) {
        alert('Please use your official @muj.manipal.edu email!');
        return;
    }

    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password: pass })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Account created successfully! You can now log in.');
            openLogin();
        } else {
            alert('Sign up error: ' + (data.error || 'Failed'));
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

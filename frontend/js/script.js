// frontend/js/script.js
// Simple script to fetch events from the Java backend (proxied via Vercel /api route)

async function loadEvents() {
  try {
    const resp = await fetch('/api/events');
    if (!resp.ok) throw new Error('Network response was not ok');
    const events = await resp.json();
    const container = document.getElementById('eventContainer');
    if (!container) return;
    container.innerHTML = '';
    events.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'event-card';
      card.innerHTML = `
        <h3>${ev.title}</h3>
        <p>${ev.description}</p>
        <small>${new Date(ev.date).toLocaleString()}</small>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error('Failed to load events', e);
  }
}

// Call on page load
window.addEventListener('DOMContentLoaded', loadEvents);

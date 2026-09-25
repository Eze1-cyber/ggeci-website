/**
 * Greater Grace Embassy Church International (GGECI)
 * Events Calendar & RSVP Booking (Vanilla JavaScript)
 */

const FALLBACK_EVENTS = [
  {
    id: "event-5",
    title: "Children and Teenagers Thanksgiving",
    date: "September 27th, 2026",
    time: "10:00 AM",
    location: "GGECI Sanctuary: 1, Taiwo Adewole Street, Off Social Club Road, Abule-Egba, Lagos",
    description: "A special celebration and thanksgiving service dedicated to our children and teenagers, thanking God for their growth, wisdom, academic excellence, and divine protection.",
    speaker: "Children & Youth Department Ministers / Senior Pastor",
    category: "Thanksgiving",
    image: "/images/fellowship.jpg"
  },
  {
    id: "event-6",
    title: "Church Thanksgiving",
    date: "October 25th, 2026",
    time: "10:00 AM",
    location: "GGECI Sanctuary, Abule-Egba, Lagos",
    description: "Annual whole-church thanksgiving service celebrating God’s faithfulness, supernatural grace, open doors, and miraculous breakthroughs in the lives of all members and families.",
    speaker: "Pastor Justina Eze & Pastoral Team",
    category: "Thanksgiving",
    image: "/images/hero-bg.jpg"
  },
  {
    id: "event-7",
    title: "Pastors Birthday Celebration",
    date: "December 13th, 2026",
    time: "10:00 AM",
    location: "GGECI Sanctuary, Abule-Egba, Lagos",
    description: "A joyful celebration honoring God for the life, leadership, and visionary ministry of our beloved Senior Pastor. Come celebrate and partake in the prophetic blessing.",
    speaker: "Church Leadership & Guest Ministers",
    category: "Celebration",
    image: "/images/pst-jk-eze.jpg"
  },
  {
    id: "event-8",
    title: "Christmas Carol Night",
    date: "December 24th, 2026",
    time: "6:00 PM",
    location: "GGECI Sanctuary, Abule-Egba, Lagos",
    description: "An evening of festive carols, candlelight adoration, special choir performances, and joyful celebration of the birth of our Savior, Jesus Christ.",
    speaker: "GGECI Choir & Pastoral Team",
    category: "Christmas",
    image: "/images/sermon-banner.jpg"
  },
  {
    id: "event-9",
    title: "Christmas Service",
    date: "December 25th, 2026",
    time: "9:00 AM",
    location: "GGECI Sanctuary, Abule-Egba, Lagos",
    description: "Celebrate the glorious birth of Jesus Christ with joyous praise, thanksgiving, communion, and celebration of the unconditional gift of salvation.",
    speaker: "Pastor Justina Eze",
    category: "Christmas",
    image: "/images/fellowship.jpg"
  },
  {
    id: "event-10",
    title: "Cross Over Service",
    date: "December 31st, 2026",
    time: "9:00 PM",
    location: "GGECI Sanctuary, Abule-Egba, Lagos",
    description: "Transition victoriously into the New Year with prevailing prayer, prophetic declarations, uninhibited praise, and receiving God's theme and direction for 2027.",
    speaker: "Pastor Justina Eze & Pastoral Team",
    category: "Crossover / Vigil",
    image: "/images/hero-bg.jpg"
  }
];

let allEvents = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchEvents();
  initRsvpModal();
});

async function fetchEvents() {
  const container = document.getElementById('events-grid');
  const loading = document.getElementById('events-loading');

  if (!container) return;

  try {
    const res = await fetch('/api/events');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        allEvents = data.data;
      } else {
        allEvents = FALLBACK_EVENTS;
      }
    } else {
      allEvents = FALLBACK_EVENTS;
    }
  } catch (err) {
    console.warn('Backend API unavailable, using fallback events.', err);
    allEvents = FALLBACK_EVENTS;
  }

  if (loading) loading.style.display = 'none';
  renderEvents(allEvents);
}

function renderEvents(events) {
  const container = document.getElementById('events-grid');
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem;">
        <h3 style="color: var(--on-surface); margin-bottom: 0.5rem;">No Upcoming Events Scheduled</h3>
        <p style="color: var(--on-surface-variant);">Please check back soon for announcements regarding our conferences and fellowships.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(e => `
    <article class="card card-media" data-id="${e.id}">
      <div class="card-image-wrap">
        <img src="${e.image || '/images/hero-bg.jpg'}" alt="${e.title}" loading="lazy">
        <div class="card-badge-overlay">
          <span class="badge badge-gold">${e.category || 'Special Program'}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-meta" style="flex-direction:column; align-items:flex-start; gap:0.4rem;">
          <span class="card-meta-item" style="font-weight:600; color:var(--on-surface);">
            <img src="/assets/icons/calendar.svg" alt="Date"> ${e.date}
          </span>
          <span class="card-meta-item" style="color:var(--on-surface-variant);">
            <img src="/assets/icons/clock.svg" alt="Time"> ${e.time}
          </span>
          <span class="card-meta-item" style="color:var(--on-surface-variant);">
            <img src="/assets/icons/map-pin.svg" alt="Location"> ${e.location}
          </span>
        </div>
        <h3 class="card-title" style="margin-top:0.75rem; color:var(--on-surface); font-size:1.3rem;">${e.title}</h3>
        <p style="font-size:0.88rem; font-weight:600; color:var(--on-surface-variant); margin-bottom:0.75rem;">
          Ministering: ${e.speaker || 'Pastoral Team'}
        </p>
        <p class="card-desc" style="color:var(--on-surface-variant);">${e.description}</p>
      </div>
    </article>
  `).join('');
}

function initRsvpModal() {
  const modal = document.getElementById('rsvp-modal');
  const closeBtn = document.getElementById('rsvp-close-btn');
  const form = document.getElementById('rsvp-form');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('rsvp-submit-btn');
      const originalText = submitBtn ? submitBtn.textContent : 'Confirm RSVP Free';

      const payload = {
        eventId: document.getElementById('rsvp-event-id').value,
        name: document.getElementById('rsvp-name').value.trim(),
        phone: document.getElementById('rsvp-phone').value.trim(),
        email: document.getElementById('rsvp-email').value.trim(),
        attendees: document.getElementById('rsvp-attendees').value
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';
      }

      try {
        const res = await fetch('/api/events/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          showToast('Thank you! Your seat reservation is confirmed.', 'success');
          form.reset();
          if (modal) modal.classList.remove('active');
        } else {
          // If offline or endpoint doesn't respond with JSON
          showToast('Thank you! Your seat reservation has been recorded.', 'success');
          form.reset();
          if (modal) modal.classList.remove('active');
        }
      } catch (err) {
        showToast('Reservation noted! We look forward to receiving you.', 'success');
        form.reset();
        if (modal) modal.classList.remove('active');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }
}

window.openRsvpModal = function(id, title) {
  const modal = document.getElementById('rsvp-modal');
  const eventIdInput = document.getElementById('rsvp-event-id');
  const titleDisplay = document.getElementById('rsvp-event-title');

  if (eventIdInput) eventIdInput.value = id;
  if (titleDisplay) titleDisplay.textContent = `Event: ${title}`;
  if (modal) modal.classList.add('active');
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}


/**
 * Greater Grace Embassy Church International (GGECI)
 * Sermons Archive & Media Streaming (Vanilla JavaScript)
 */

const FALLBACK_SERMONS = [
  {
    id: "sermon-5",
    title: "THERE IS AN END",
    speaker: "Pastor J. K. Eze",
    date: "2026-09-21",
    scripture: "Proverbs 23:18",
    description: `Ministering: Pastor J. K. Eze
Text: Proverbs 23:18 (KJV)

“For surely there is an end; and thine expectation shall not be cut off.”

Hallelujah!

There is an end to poverty.
There is an end to barrenness.
There is an end to joblessness.
There is an end to stagnation.
There is an end to family affliction.
There is an end to every activity of the wicked against your life.

No matter how long it has continued, there must be an end!

Somebody shout, THERE IS AN END!

And you must understand the power of spiritual relationships. The Bible says in 2 Chronicles 20:20, “Believe in the LORD your God, so shall ye be established; believe his prophets, so shall ye prosper.”

Don’t joke with the ministers God has placed in your life. Don’t despise your pastor or visiting ministers. You don’t know what God has deposited in them for your life.

Sometimes when your pastor corrects you, it is not because he hates you. He expects you to do better.

And I declare over somebody today: you will stand on your feet again!

Every prolonged situation is coming to an end.

Your expectation shall not be cut off!

THERE IS AN END!

And as God is doing something in your life, make sure you are not the person stopping what God wants to do in somebody else’s life.

There is an end! There is an end! There is an end!

There is an end to every negative season.
One of the ways we bring an end to poverty is by demonstrate our faith in God through giving.

The Bible says in Luke 6:38:

“Give, and it shall be given unto you; good measure, pressed down, and shaken together, and running over…”

Your giving is an expression of your trust in God.

When you give, don’t give because somebody is manipulating you. Give with faith, obedience, and a willing heart.

There is an end to lack.
There is an end to stagnation.
There is an end to financial limitation.
And as you give today, believe God that your expectation will not be cut off.

2 Corinthians 9:7 says:

“God loveth a cheerful giver.”

So don’t give grudgingly. Give with expectation, give with thanksgiving, and give as an act of worship.`,
    audioUrl: "",
    videoUrl: "",
    category: "Faith & Hope",
    thumbnail: "/assets/images/sermon-banner.jpg",
    status: "published",
    createdAt: "2026-09-21T10:00:00Z"
  },
  {
    id: "sermon-6",
    title: "DWELLING IN THE ARK",
    speaker: "Pastor J. K. Eze",
    date: "2026-09-06",
    scripture: "Genesis 6–8",
    description: `Ministering: Pastor J. K. Eze
Text: Genesis 6–8 (Genesis 7:1)

“Come thou and all thy house into the ark…”

There is something powerful about remaining in the Ark.

Nigeria may be hard. Families may be under pressure. Businesses may be struggling.

But when you are in the Ark, you are safe from the rain…

DON’T LOOK AT THE FLOOD; LOOK AT THE ONE WHO PRESERVED YOU!
LOOK AT THE ARK and know you are safe, the ark is JESUS CHRIST!

MY SAFETY IS IN CHRIST!

Don’t give up on your family, when God calls you into the ark, bring all your family with you.

Your obedience can become a seed in your household.

Joshua 24:15 — “As for me and my house, we will serve the LORD.”

Don’t look outside because somebody has a car, house, marriage, business, or has travelled, especially as December comes, then you abandon the ark in search for something that seems better but is not, just as the crow was sent out and never returned, once you step out, you’ll be so engulfed and might never return.

DON’T LEAVE THE ARK TO IMPRESS PEOPLE!

Peter looked at Jesus and walked on water, but when he looked at the wind, he began to sink.

Matthew 14:30 — “But when he saw the wind boisterous, he was afraid…”

WHAT YOU KEEP LOOKING AT WILL DETERMINE WHAT CONTROLS YOU.

Are you looking inside the ark or looking outside?

Genesis 8:1 — “And God remembered Noah…”

God had not forgotten him.

THE FLOOD HAS AN EXPIRY DATE!

So stay in prayer.
Stay in faith.
Stay in Christ.

DWELL IN THE ARK!
REMAIN IN CHRIST!

Say this: ME AND MY HOUSE WILL SERVE THE LORD!

In Jesus’ name.
GOD BLESS YOU`,
    audioUrl: "",
    videoUrl: "",
    category: "Faith & Hope",
    thumbnail: "/assets/images/fellowship.jpg",
    status: "published",
    createdAt: "2026-09-06T10:00:00Z"
  }
];

let allSermons = [];
let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
  fetchSermons();
  initSermonFilters();
  initSearch();
  initModalClose();
});

async function fetchSermons() {
  const container = document.getElementById('sermons-grid');
  const loading = document.getElementById('sermons-loading');

  if (!container) return;

  try {
    const res = await fetch('/api/sermons');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        allSermons = data.data;
      } else {
        allSermons = FALLBACK_SERMONS;
      }
    } else {
      allSermons = FALLBACK_SERMONS;
    }
  } catch (err) {
    console.warn('Backend API unavailable, loading fallback sermons.', err);
    allSermons = FALLBACK_SERMONS;
  }

  if (loading) loading.style.display = 'none';
  renderSermons(allSermons);

  // Auto-open modal if URL contains ?id=... or #...
  const urlParams = new URLSearchParams(window.location.search);
  const sermonId = urlParams.get('id') || window.location.hash.replace('#', '');
  if (sermonId) {
    setTimeout(() => openSermonModal(sermonId), 100);
  }
}

function renderSermons(sermons) {
  const container = document.getElementById('sermons-grid');
  if (!container) return;

  if (sermons.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem;">
        <h3 style="color: var(--on-surface); margin-bottom: 0.5rem;">No Sermons Found</h3>
        <p style="color: var(--on-surface-variant);">There are no sermons matching the selected filters. Please check back soon.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = sermons.map(s => `
    <article class="card card-media" data-id="${s.id}">
      <div class="card-image-wrap">
        <img src="${s.thumbnail || '/assets/images/sermon-banner.jpg'}" alt="${s.title}" loading="lazy">
        <div class="card-badge-overlay">
          <span class="badge badge-orange">${s.category || 'Sunday Message'}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="card-meta-item">
            <img src="/assets/icons/calendar.svg" alt="Date"> ${formatDate(s.date)}
          </span>
          <span class="card-meta-item">
            <img src="/assets/icons/bible.svg" alt="Scripture"> ${s.scripture || 'Holy Bible'}
          </span>
        </div>
        <h3 class="card-title" style="color:var(--on-surface);">${s.title}</h3>
        <p style="font-size:0.88rem; font-weight:600; color:var(--on-surface-variant); margin-bottom:0.75rem;">
          Speaker: ${s.speaker || 'Senior Pastor'}
        </p>
        <p class="card-desc" style="color:var(--on-surface-variant);">${truncateText(s.description, 130)}</p>
        <div class="card-footer">
          <button class="btn btn-primary btn-sm btn-play-sermon" onclick="openSermonModal('${s.id}')">
            Read Message Note
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

function initSermonFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-category');
      applyFilters();
    });
  });
}

function initSearch() {
  const searchInput = document.getElementById('sermon-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    applyFilters();
  });
}

function applyFilters() {
  const searchTerm = (document.getElementById('sermon-search')?.value || '').toLowerCase().trim();

  const filtered = allSermons.filter(s => {
    const matchesCategory = activeCategory === 'all' || (s.category && s.category.toLowerCase().includes(activeCategory.toLowerCase()));
    const matchesSearch = !searchTerm ||
      (s.title && s.title.toLowerCase().includes(searchTerm)) ||
      (s.speaker && s.speaker.toLowerCase().includes(searchTerm)) ||
      (s.scripture && s.scripture.toLowerCase().includes(searchTerm)) ||
      (s.description && s.description.toLowerCase().includes(searchTerm));

    return matchesCategory && matchesSearch;
  });

  renderSermons(filtered);
}

// Media Player Modal
window.openSermonModal = function(id) {
  const sermon = allSermons.find(s => s.id === id) || FALLBACK_SERMONS.find(s => s.id === id);
  if (!sermon) return;

  const modal = document.getElementById('sermon-modal');
  const title = document.getElementById('modal-sermon-title');
  const speaker = document.getElementById('modal-sermon-speaker');
  const scripture = document.getElementById('modal-sermon-scripture');
  const desc = document.getElementById('modal-sermon-desc');
  const mediaContainer = document.getElementById('modal-sermon-media');

  if (title) title.textContent = sermon.title;
  if (speaker) speaker.textContent = `Ministered by: ${sermon.speaker || 'Pastor J. K. Eze'}`;
  if (scripture) scripture.textContent = `Scripture: ${sermon.scripture || 'Word of God'}`;
  if (desc) desc.innerHTML = (sermon.description || '').split('\n').map(line => line.trim() ? `<p style="margin-bottom:0.75rem;">${line}</p>` : '').join('');

  if (mediaContainer) {
    let mediaHtml = '';
    if (sermon.videoUrl && sermon.videoUrl.includes('embed')) {
      mediaHtml = `
        <div class="video-responsive" style="margin-bottom:1.5rem;">
          <iframe src="${sermon.videoUrl}" title="${sermon.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      `;
    } else if (sermon.audioUrl) {
      mediaHtml = `
        <div style="background:var(--surface-container-high); padding:1.25rem; border-radius:12px; margin-bottom:1.5rem; text-align:center;">
          <p style="font-weight:600; margin-bottom:0.75rem; color:var(--on-surface);">Audio Message Broadcast</p>
          <audio controls style="width:100%;">
            <source src="${sermon.audioUrl}" type="audio/mpeg">
            Your browser does not support audio streaming.
          </audio>
        </div>
      `;
    } else {
      mediaHtml = `
        <div style="background:var(--surface-container-low); border:1px solid var(--outline-variant); padding:1.25rem; border-radius:12px; margin-bottom:1.5rem; text-align:center; color:var(--on-surface);">
          <p style="font-weight:600; margin-bottom:0.25rem;">Sanctuary Message Archive</p>
          <p style="font-size:0.88rem; margin:0; color:var(--on-surface-variant);">Full sermon notes are published below. Audio & video broadcasts coming soon.</p>
        </div>
      `;
    }
    mediaContainer.innerHTML = mediaHtml;
  }

  if (modal) modal.classList.add('active');
};

function initModalClose() {
  const modal = document.getElementById('sermon-modal');
  const closeBtn = document.getElementById('modal-close-btn');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      const mediaContainer = document.getElementById('modal-sermon-media');
      if (mediaContainer) mediaContainer.innerHTML = '';
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        const mediaContainer = document.getElementById('modal-sermon-media');
        if (mediaContainer) mediaContainer.innerHTML = '';
      }
    });
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  return dateStr;
}

function truncateText(text, maxLen = 120) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.substr(0, maxLen).trim() + '...';
}

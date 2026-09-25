/**
 * Greater Grace Embassy Church International (GGECI)
 * Core Site Utilities (Vanilla JavaScript)
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initActiveLinks();
});

/* Mobile Navigation Toggle */
function initNavbar() {
  const toggleBtn = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navbar = document.querySelector('.navbar');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const isExpanded = navMenu.classList.contains('open');
      toggleBtn.setAttribute('aria-expanded', isExpanded);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!toggleBtn.contains(e.target) && !navMenu.contains(e.target) && navMenu.classList.contains('open')) {
        navMenu.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', false);
      }
    });
  }

  // Navbar shadow on scroll
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }, { passive: true });
  }
}

/* Highlight current active page link */
function initActiveLinks() {
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const cleanHref = href.replace(/\/$/, '') || '/';

    if (currentPath === cleanHref || (cleanHref !== '/' && currentPath.endsWith(cleanHref))) {
      link.classList.add('active');
    }
  });
}

/* Toast Notification Utility */
window.showToast = function(message, type = 'info', duration = 4500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div style="flex:1;">${message}</div>
    <button style="background:none; border:none; cursor:pointer; color:#94A3B8; font-size:1.1rem; line-height:1;" aria-label="Close">&times;</button>
  `;

  toast.querySelector('button').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, duration);
};

/* Copy text to clipboard helper */
window.copyToClipboard = function(text, successMessage = 'Copied to clipboard!') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      window.showToast(successMessage, 'success');
    }).catch(() => fallbackCopy(text, successMessage));
  } else {
    fallbackCopy(text, successMessage);
  }
};

function fallbackCopy(text, successMessage) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    window.showToast(successMessage, 'success');
  } catch (err) {
    window.showToast('Unable to copy. Please manually select and copy.', 'error');
  }
  document.body.removeChild(textArea);
}

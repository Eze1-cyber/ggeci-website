/**
 * Greater Grace Embassy Church International (GGECI)
 * Newsletter Subscription & Unsubscribe (Vanilla JavaScript)
 */

document.addEventListener('DOMContentLoaded', () => {
  initNewsletterForms();
  initUnsubscribeModal();
});

function initNewsletterForms() {
  // Can be present on footer or newsletter.html
  const forms = document.querySelectorAll('.newsletter-form');

  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = form.querySelector('input[type="email"]');
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!emailInput) return;
      const email = emailInput.value.trim();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        window.showToast('Please enter a valid email address.', 'error');
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          window.showToast(data.message, 'success');
          form.reset();
        } else {
          window.showToast(data.error || 'Could not process newsletter subscription.', 'error');
        }
      } catch (err) {
        window.showToast('Network error. Please try again later.', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
}

function initUnsubscribeModal() {
  const openLinks = document.querySelectorAll('.open-unsubscribe');
  const modal = document.getElementById('unsubscribe-modal');
  const closeBtn = document.getElementById('unsubscribe-close-btn');
  const form = document.getElementById('unsubscribe-form');

  openLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (modal) modal.classList.add('active');
    });
  });

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
      const email = document.getElementById('unsub-email').value.trim();
      const submitBtn = document.getElementById('unsub-submit-btn');

      if (!email) {
        window.showToast('Please enter the email address you wish to unsubscribe.', 'error');
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, action: 'unsubscribe' })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          window.showToast(data.message, 'success');
          modal.classList.remove('active');
          form.reset();
        } else {
          window.showToast(data.error || 'Email could not be unsubscribed.', 'error');
        }
      } catch (err) {
        window.showToast('Network error during unsubscribe.', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

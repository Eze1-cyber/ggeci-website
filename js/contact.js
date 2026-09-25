/**
 * Greater Grace Embassy Church International (GGECI)
 * Contact Form Handler (Vanilla JavaScript)
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const alertSuccess = document.getElementById('contact-alert-success');
  const alertError = document.getElementById('contact-alert-error');
  const alertLoading = document.getElementById('contact-alert-loading');
  const submitBtn = document.getElementById('contact-submit-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    hideAlert(alertSuccess);
    hideAlert(alertError);
    showAlert(alertLoading);
    if (submitBtn) submitBtn.disabled = true;

    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const subject = document.getElementById('contact-subject').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    const honeypot = document.getElementById('contact-company')
      ? document.getElementById('contact-company').value
      : '';

    // Validation
    if (!name) {
      showError('Please enter your full name.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }
    if (!message || message.length < 5) {
      showError('Please provide your message so we may assist you.');
      return;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          subject,
          message,
          honeypot
        })
      });

      const data = await response.json();
      hideAlert(alertLoading);

      if (response.ok && data.success) {
        if (alertSuccess) {
          alertSuccess.textContent = data.message;
          showAlert(alertSuccess);
        }
        form.reset();
        window.showToast('Your message was sent successfully!', 'success');
      } else {
        showError(data.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      hideAlert(alertLoading);
      showError('A network error occurred. Please check your internet connection.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  function showError(msg) {
    hideAlert(alertLoading);
    if (alertError) {
      alertError.textContent = msg;
      showAlert(alertError);
    } else {
      window.showToast(msg, 'error');
    }
    if (submitBtn) submitBtn.disabled = false;
  }

  function showAlert(el) {
    if (el) el.classList.add('show');
  }

  function hideAlert(el) {
    if (el) el.classList.remove('show');
  }
});

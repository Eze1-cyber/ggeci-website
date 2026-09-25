/**
 * Greater Grace Embassy Church International (GGECI)
 * Pastoral Counselling & Appointment Booking Handler (Vanilla JavaScript)
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('counselling-form');
  const alertSuccess = document.getElementById('counsel-alert-success');
  const alertError = document.getElementById('counsel-alert-error');
  const alertLoading = document.getElementById('counsel-alert-loading');
  const submitBtn = document.getElementById('counsel-submit-btn');

  // Prevent selecting past dates
  const dateInput = document.getElementById('counsel-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    hideAlert(alertSuccess);
    hideAlert(alertError);
    showAlert(alertLoading);
    if (submitBtn) submitBtn.disabled = true;

    const name = document.getElementById('counsel-name').value.trim();
    const email = document.getElementById('counsel-email').value.trim();
    const phone = document.getElementById('counsel-phone').value.trim();
    const preferredDate = document.getElementById('counsel-date').value;
    const preferredTime = document.getElementById('counsel-time').value;
    const counsellingType = document.getElementById('counsel-type').value;
    const message = document.getElementById('counsel-message').value.trim();
    const honeypot = document.getElementById('counsel-organization')
      ? document.getElementById('counsel-organization').value
      : '';

    // Validation
    if (!name) {
      showError('Please provide your full name.');
      return;
    }
    if (!phone || phone.length < 7) {
      showError('Please provide a valid phone number for appointment confirmation.');
      return;
    }
    if (!preferredDate) {
      showError('Please select your preferred appointment date.');
      return;
    }

    try {
      const response = await fetch('/api/counselling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          preferredDate,
          preferredTime,
          counsellingType,
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
        window.showToast('Counselling request submitted successfully.', 'success');
      } else {
        showError(data.error || 'Failed to submit appointment request.');
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

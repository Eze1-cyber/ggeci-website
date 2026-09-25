/**
 * Greater Grace Embassy Church International (GGECI)
 * Prayer Request Form Handler (Vanilla JavaScript)
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('prayer-form');
  const alertSuccess = document.getElementById('prayer-alert-success');
  const alertError = document.getElementById('prayer-alert-error');
  const alertLoading = document.getElementById('prayer-alert-loading');
  const submitBtn = document.getElementById('prayer-submit-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset alert states
    hideAlert(alertSuccess);
    hideAlert(alertError);
    showAlert(alertLoading);
    if (submitBtn) submitBtn.disabled = true;

    const name = document.getElementById('prayer-name').value.trim();
    const email = document.getElementById('prayer-email').value.trim();
    const phone = document.getElementById('prayer-phone').value.trim();
    const category = document.getElementById('prayer-category').value;
    const request = document.getElementById('prayer-request').value.trim();
    const isConfidential = document.getElementById('prayer-confidential')
      ? document.getElementById('prayer-confidential').checked
      : true;
    const honeypot = document.getElementById('prayer-website')
      ? document.getElementById('prayer-website').value
      : '';

    // Client-side validation
    if (!name) {
      showError('Please provide your name so we know how to address your petition before God.');
      return;
    }
    if (!request || request.length < 5) {
      showError('Please write your prayer request so our prayer warriors can stand in agreement with you.');
      return;
    }

    try {
      const response = await fetch('/api/prayer-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          category,
          request,
          isConfidential,
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
        window.showToast('Prayer request submitted! Standing with you in faith.', 'success');
      } else {
        showError(data.error || 'Unable to submit prayer request. Please try again.');
      }
    } catch (err) {
      hideAlert(alertLoading);
      showError('Network error. Please verify your connection and try again.');
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

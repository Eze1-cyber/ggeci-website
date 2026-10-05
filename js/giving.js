/**
 * Greater Grace Embassy Church International (GGECI)
 * Online Giving & Paystack Checkout Integration (Vanilla JavaScript)
 */

let paymentConfig = {
  hasPaystack: false,
  publicKey: ''
};

document.addEventListener('DOMContentLoaded', () => {
  initCopyButtons();
  initAmountPresets();
  initTransferNotificationForm();
  checkPaymentGateway();
  checkReturnUrlPayment();
});

async function checkPaymentGateway() {
  try {
    const res = await fetch('/api/giving');
    if (!res.ok) return;
    const json = await res.json();
    if (json.data && json.data.onlinePayment) {
      paymentConfig.hasPaystack = json.data.onlinePayment.enabled;
      paymentConfig.publicKey = json.data.onlinePayment.publicKey;

      const onlineNotice = document.getElementById('online-payment-notice');
      if (onlineNotice) {
        if (paymentConfig.hasPaystack) {
          onlineNotice.innerHTML = `
            <div style="background:#F0FDF4; border:1px solid #BBF7D0; color:#166534; padding:0.75rem 1rem; border-radius:8px; font-size:0.88rem; display:flex; align-items:center; gap:0.5rem;">
              <span style="font-weight:700;">&#10003;</span> Secure Paystack Online Card &amp; Bank Gateway Active
            </div>
          `;
        } else {
          onlineNotice.innerHTML = `
            <div style="background:#FFFBEB; border:1px solid #FDE68A; color:#92400E; padding:0.75rem 1rem; border-radius:8px; font-size:0.88rem;">
              <strong>Paystack Connection Notice:</strong> Online card processing activates automatically when <code>PAYSTACK_PUBLIC_KEY</code> is added to your Vercel environment variables. In test mode, online giving proceeds seamlessly.
            </div>
          `;
        }
      }
    }
  } catch (e) {
    console.warn('Could not query giving endpoint:', e);
  }
}

// Check if user returned from a Paystack redirect (e.g. ?reference=...)
async function checkReturnUrlPayment() {
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference') || urlParams.get('trxref');
  
  if (!reference) return;

  const alertSuccess = document.getElementById('paystack-alert-success');
  const alertError = document.getElementById('paystack-alert-error');

  let pending = null;
  try {
    const raw = sessionStorage.getItem('ggeci_pending_giving');
    if (raw) pending = JSON.parse(raw);
  } catch (e) {}

  if (!pending || !pending.amount) {
    return;
  }

  try {
    const res = await fetch('/api/giving', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donorName: pending.name || 'Online Giver',
        email: pending.email || 'giver@ggeci.com',
        amount: pending.amount.toString(),
        currency: 'NGN',
        purpose: pending.purpose || 'Online Giving',
        method: 'Paystack Card/Bank',
        reference: reference
      })
    });
    
    const data = await res.json();
    if (res.ok && data.success && data.verified === true) {
      try { sessionStorage.removeItem('ggeci_pending_giving'); } catch (e) {}
      if (alertError) alertError.classList.remove('show');
      if (alertSuccess) {
        alertSuccess.innerHTML = `<strong>Hallelujah! Payment Verified!</strong><br>Ref: <code>${reference}</code>. ${data.message}`;
        alertSuccess.classList.add('show');
      }
      if (window.showToast) {
        window.showToast('Payment verified! May God bless you abundantly.', 'success');
      }
    } else {
      if (alertSuccess) alertSuccess.classList.remove('show');
      const errorMsg = (data && data.error) || 'Payment verification could not be confirmed.';
      if (alertError) {
        alertError.innerHTML = `<strong>Payment Verification Alert:</strong><br>${errorMsg}<br>Ref: <code>${reference}</code>`;
        alertError.classList.add('show');
      }
      if (window.showToast) {
        window.showToast(errorMsg, 'error');
      }
    }
  } catch (err) {
    console.warn('Error processing return URL payment reference:', err);
  }
}

function initCopyButtons() {
  const copyButtons = document.querySelectorAll('.btn-copy-account');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const accountNum = btn.getAttribute('data-account');
      const bankName = btn.getAttribute('data-bank');
      if (accountNum && window.copyToClipboard) {
        window.copyToClipboard(accountNum, `${bankName} account number (${accountNum}) copied to clipboard!`);
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = 'Copy Account';
        }, 2500);
      }
    });
  });
}

function initAmountPresets() {
  const presetBtns = document.querySelectorAll('.amount-preset');
  const amountInput = document.getElementById('giving-amount');

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.getAttribute('data-value');
      if (amountInput && val) {
        amountInput.value = val;
      }
    });
  });

  if (amountInput) {
    amountInput.addEventListener('input', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
    });
  }
}

function initTransferNotificationForm() {
  const notifyForm = document.getElementById('transfer-notify-form');
  const alertSuccess = document.getElementById('notify-alert-success');
  const alertError = document.getElementById('notify-alert-error');
  const submitBtn = document.getElementById('notify-submit-btn');

  if (!notifyForm) return;

  notifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const donorName = document.getElementById('notify-name')?.value.trim();
    const email = document.getElementById('notify-email')?.value.trim();
    const amount = document.getElementById('giving-amount')?.value.trim();
    const purpose = document.getElementById('giving-purpose')?.value;
    const bank = document.getElementById('notify-bank')?.value;
    const reference = document.getElementById('notify-ref')?.value.trim();

    if (!amount || isNaN(parseFloat(amount))) {
      if (window.showToast) window.showToast('Please specify your giving amount in Naira (₦).', 'error');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch('/api/giving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName: donorName || 'Beloved Giver',
          email,
          amount,
          currency: 'NGN',
          purpose: `${purpose} (${bank})`,
          method: 'Bank Transfer',
          reference: reference || `TRF-${Date.now()}`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (alertSuccess) {
          alertSuccess.textContent = data.message;
          alertSuccess.classList.add('show');
        }
        notifyForm.reset();
        if (window.showToast) window.showToast('Donation details notified! God bless your giving.', 'success');
      } else {
        if (alertError) {
          alertError.textContent = data.error || 'Failed to record donation.';
          alertError.classList.add('show');
        }
      }
    } catch (err) {
      if (window.showToast) window.showToast('Network error submitting transfer notice.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

// Online Paystack Trigger
window.payWithPaystack = function() {
  const nameInput = document.getElementById('giving-name');
  const emailInput = document.getElementById('giving-email');
  const purposeInput = document.getElementById('giving-purpose');
  const amountInput = document.getElementById('giving-amount');

  const alertSuccess = document.getElementById('paystack-alert-success');
  const alertError = document.getElementById('paystack-alert-error');

  if (alertSuccess) alertSuccess.classList.remove('show');
  if (alertError) alertError.classList.remove('show');

  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const purpose = purposeInput ? purposeInput.value : 'Tithe';
  const amountStr = amountInput ? amountInput.value.trim() : '';
  const amount = parseFloat(amountStr);

  if (!name) {
    if (window.showToast) window.showToast('Please enter your full name.', 'error');
    if (nameInput) nameInput.focus();
    return;
  }

  if (!email || !email.includes('@')) {
    if (window.showToast) window.showToast('Please enter a valid email address.', 'error');
    if (emailInput) emailInput.focus();
    return;
  }

  if (!amountStr || isNaN(amount) || amount <= 0) {
    if (window.showToast) window.showToast('Please enter a valid giving amount in Naira (₦).', 'error');
    if (amountInput) amountInput.focus();
    return;
  }

  const btnGiveNow = document.getElementById('btn-give-now');
  if (btnGiveNow) {
    btnGiveNow.disabled = true;
    btnGiveNow.innerHTML = 'Connecting Paystack...';
  }

  // Stash pending donation details in case of 3DS redirect authentication
  try {
    sessionStorage.setItem('ggeci_pending_giving', JSON.stringify({
      name,
      email,
      amount: amount.toString(),
      purpose
    }));
  } catch (e) {}

  // Check if live/test public key exists
  const activeKey = paymentConfig.publicKey || 'pk_test_9e112e5e5b25fcf5f05b45bb6626bf308e80ac5b';

  // Load Paystack Inline SDK dynamically if needed
  if (typeof PaystackPop === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => launchPaystackCheckout(activeKey, amount, email, name, purpose);
    script.onerror = () => {
      if (btnGiveNow) {
        btnGiveNow.disabled = false;
        btnGiveNow.innerHTML = 'Give Now &rarr;';
      }
      if (alertError) {
        alertError.innerHTML = '<strong>Connection Error:</strong> Unable to load the Paystack checkout module. Please check your internet connection.';
        alertError.classList.add('show');
      }
      if (window.showToast) window.showToast('Could not load Paystack checkout.', 'error');
    };
    document.head.appendChild(script);
  } else {
    launchPaystackCheckout(activeKey, amount, email, name, purpose);
  }
};

function launchPaystackCheckout(publicKey, amount, email, name, purpose) {
  const btnGiveNow = document.getElementById('btn-give-now');
  const alertError = document.getElementById('paystack-alert-error');
  
  try {
    const handler = PaystackPop.setup({
      key: publicKey,
      email: email,
      amount: Math.round(amount * 100), // Kobo conversion
      currency: 'NGN',
      ref: `GGECI-GIVE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      metadata: {
        custom_fields: [
          { display_name: "Donor Name", variable_name: "donor_name", value: name },
          { display_name: "Giving Category", variable_name: "purpose", value: purpose }
        ]
      },
      callback: function(response) {
        recordSuccessfulPayment(name, email, amount, purpose, response.reference || response.trxref);
      },
      onClose: function() {
        if (btnGiveNow) {
          btnGiveNow.disabled = false;
          btnGiveNow.innerHTML = 'Give Now &rarr;';
        }
        if (window.showToast) window.showToast('Paystack checkout window closed.', 'info');
      }
    });

    handler.openIframe();
  } catch (err) {
    console.warn('Paystack inline SDK error:', err);
    if (btnGiveNow) {
      btnGiveNow.disabled = false;
      btnGiveNow.innerHTML = 'Give Now &rarr;';
    }
    if (alertError) {
      alertError.innerHTML = '<strong>Error opening checkout:</strong> Unable to initialize Paystack checkout. Please check your internet connection.';
      alertError.classList.add('show');
    }
  }
}

async function recordSuccessfulPayment(name, email, amount, purpose, reference) {
  const btnGiveNow = document.getElementById('btn-give-now');
  const alertSuccess = document.getElementById('paystack-alert-success');
  const alertError = document.getElementById('paystack-alert-error');

  if (alertSuccess) alertSuccess.classList.remove('show');
  if (alertError) alertError.classList.remove('show');

  try {
    const res = await fetch('/api/giving', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donorName: name,
        email: email,
        amount: amount.toString(),
        currency: 'NGN',
        purpose: purpose,
        method: 'Paystack Card/Bank',
        reference: reference
      })
    });

    const data = await res.json();

    // Strictly require HTTP 200, success flag, and explicit verified confirmation from backend
    if (res.ok && data.success && data.verified === true) {
      try { sessionStorage.removeItem('ggeci_pending_giving'); } catch (e) {}

      if (alertSuccess) {
        alertSuccess.innerHTML = `
          <strong>Hallelujah! Payment Successfully Processed!</strong><br>
          Thank you, <strong>${name}</strong>, for giving <strong>&#8358;${parseFloat(amount).toLocaleString()}</strong> towards <strong>${purpose}</strong>.<br>
          Reference: <code>${reference}</code><br>
          <small>May the Lord open the windows of heaven and pour out blessings upon you!</small>
        `;
        alertSuccess.classList.add('show');
      }

      // Reset giving form
      const givingForm = document.getElementById('paystack-giving-form');
      if (givingForm) givingForm.reset();

      if (window.showToast) window.showToast('Payment verified successfully! May God bless your giving abundantly.', 'success');
    } else {
      // Verification failed or was rejected by server
      const failMsg = (data && data.error) ? data.error : 'Payment verification could not be confirmed. If your account was debited, please contact the church office.';
      if (alertError) {
        alertError.innerHTML = `
          <strong>Payment Verification Alert:</strong><br>
          ${failMsg}<br>
          Reference: <code>${reference}</code>
        `;
        alertError.classList.add('show');
      }
      if (window.showToast) window.showToast(failMsg, 'error');
    }
  } catch (err) {
    console.error('Error verifying payment record:', err);
    const networkMsg = `A network error occurred while verifying your payment with the server. If debited, please retain your reference: ${reference}`;
    if (alertError) {
      alertError.innerHTML = `
        <strong>Verification Pending:</strong><br>
        ${networkMsg}
      `;
      alertError.classList.add('show');
    }
    if (window.showToast) window.showToast('Network error verifying payment.', 'error');
  } finally {
    if (btnGiveNow) {
      btnGiveNow.disabled = false;
      btnGiveNow.innerHTML = 'Give Now &rarr;';
    }
  }
}


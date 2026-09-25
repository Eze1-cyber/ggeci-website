/**
 * Greater Grace Embassy Church International (GGECI)
 * Online Giving & Bank Transfer Integration (Vanilla JavaScript)
 */

document.addEventListener('DOMContentLoaded', () => {
  initCopyButtons();
  initAmountPresets();
  initTransferNotificationForm();
  checkPaymentGateway();
});

let paymentConfig = {
  hasPaystack: false,
  publicKey: ''
};

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
          onlineNotice.innerHTML = `<span style="color:#16A34A; font-weight:600;">&#10003; Secure Online Card Checkout Active via Paystack</span>`;
        } else {
          onlineNotice.innerHTML = `
            <div style="background:#FFFBEB; border:1px solid #FDE68A; color:#92400E; padding:0.75rem 1rem; border-radius:8px; font-size:0.88rem;">
              <strong>Notice for Church Administrators:</strong> Online debit card processing will automatically activate once <code>PAYSTACK_PUBLIC_KEY</code> is set in your Vercel environment variables. In the meantime, direct Nigerian bank transfers are verified 24/7.
            </div>
          `;
        }
      }
    }
  } catch (e) {
    console.warn('Could not query giving endpoint:', e);
  }
}

function initCopyButtons() {
  const copyButtons = document.querySelectorAll('.btn-copy-account');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const accountNum = btn.getAttribute('data-account');
      const bankName = btn.getAttribute('data-bank');
      if (accountNum) {
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

    const donorName = document.getElementById('notify-name').value.trim();
    const email = document.getElementById('notify-email').value.trim();
    const amount = document.getElementById('giving-amount').value.trim();
    const purpose = document.getElementById('giving-purpose').value;
    const bank = document.getElementById('notify-bank').value;
    const reference = document.getElementById('notify-ref').value.trim();

    if (!amount || isNaN(parseFloat(amount))) {
      window.showToast('Please specify your giving amount.', 'error');
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
        window.showToast('Donation details notified! God bless your giving.', 'success');
      } else {
        if (alertError) {
          alertError.textContent = data.error || 'Failed to record donation.';
          alertError.classList.add('show');
        }
      }
    } catch (err) {
      window.showToast('Network error submitting transfer notice.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

// Online Paystack Trigger (if key configured)
window.payWithPaystack = function() {
  const amount = document.getElementById('giving-amount').value.trim();
  const email = document.getElementById('notify-email').value.trim() || 'giver@ggeci.com';
  const name = document.getElementById('notify-name').value.trim() || 'Church Member';
  const purpose = document.getElementById('giving-purpose').value;

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    window.showToast('Please enter a valid amount before proceeding with online payment.', 'error');
    return;
  }

  if (!paymentConfig.hasPaystack || !paymentConfig.publicKey) {
    window.showToast('Paystack card payment gateway requires PAYSTACK_PUBLIC_KEY in environment variables. Please use our direct bank transfer accounts below.', 'info');
    document.getElementById('bank-accounts-section').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // Load Paystack Inline script on demand if not already loaded
  if (typeof PaystackPop === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => launchPaystack(amount, email, name, purpose);
    document.head.appendChild(script);
  } else {
    launchPaystack(amount, email, name, purpose);
  }
};

function launchPaystack(amount, email, name, purpose) {
  const handler = PaystackPop.setup({
    key: paymentConfig.publicKey,
    email: email,
    amount: Math.round(parseFloat(amount) * 100), // Paystack expects amount in Kobo
    currency: 'NGN',
    metadata: {
      custom_fields: [
        { display_name: "Donor Name", variable_name: "donor_name", value: name },
        { display_name: "Purpose", variable_name: "purpose", value: purpose }
      ]
    },
    callback: function(response) {
      // Record verified payment with backend
      fetch('/api/giving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName: name,
          email: email,
          amount: amount,
          currency: 'NGN',
          purpose: purpose,
          method: 'Paystack Card/Bank',
          reference: response.reference
        })
      }).then(() => {
        window.showToast('Payment successful! May God bless you abundantly.', 'success');
      });
    },
    onClose: function() {
      window.showToast('Giving transaction cancelled.', 'info');
    }
  });
  handler.openIframe();
}

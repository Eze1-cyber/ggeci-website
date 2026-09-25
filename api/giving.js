// api/giving.js
// Handles online giving details, bank transfer records, and Paystack integration
const db = require('./db');
const https = require('https');

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function getAdminUser(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return db.verifySessionToken(token);
  }
  return null;
}

function verifyPaystackServer(reference, secretKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${encodeURIComponent(reference)}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const admin = getAdminUser(req);

  // GET GIVING INFO OR ADMIN LIST
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const adminView = url.searchParams.get('admin');

    if (adminView === 'true' && admin) {
      const donations = db.getCollection('donations');
      return res.status(200).json({ success: true, data: donations });
    }

    const accounts = db.getCollection('giving_accounts');
    const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY || '';

    return res.status(200).json({
      success: true,
      data: {
        accounts,
        onlinePayment: {
          enabled: Boolean(paystackPublicKey),
          provider: 'Paystack',
          publicKey: paystackPublicKey,
          note: paystackPublicKey
            ? 'Online giving is securely active via Paystack.'
            : 'Online card payment gateway requires PAYSTACK_PUBLIC_KEY in environment variables. Direct bank transfers are active 24/7.'
        }
      }
    });
  }

  // RECORD DONATION OR VERIFY PAYSTACK
  if (req.method === 'POST') {
    const body = await parseBody(req);
    const { donorName, email, amount, currency, purpose, method, reference } = body;

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: 'Please specify a valid giving amount.' });
    }

    let status = 'Recorded';

    // If a paystack reference is passed and PAYSTACK_SECRET_KEY is configured, verify on server!
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (reference && secretKey) {
      try {
        const verifyRes = await verifyPaystackServer(reference, secretKey);
        if (verifyRes && verifyRes.status && verifyRes.data.status === 'success') {
          status = 'Verified Successful';
        } else {
          status = 'Verification Failed';
        }
      } catch (err) {
        console.warn('Paystack server-side verification check error:', err.message);
        status = 'Pending Confirmation';
      }
    } else if (method === 'Bank Transfer') {
      status = 'Bank Transfer Notified';
    }

    const donation = db.insert('donations', {
      donorName: (donorName || 'Beloved Giver').trim(),
      email: (email || '').trim(),
      amount: parseFloat(amount).toLocaleString(),
      currency: currency || 'NGN',
      purpose: purpose || 'Tithe / Offering',
      method: method || 'Direct Transfer',
      reference: reference || `REF-${Date.now()}`,
      status,
      date: new Date().toISOString().split('T')[0]
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for honoring the Lord with your substance at Greater Grace Embassy Church International. May God open the windows of heaven upon you!',
      data: donation
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

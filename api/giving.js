// api/giving.js
// Handles online giving details, bank transfer records, Paystack verification, and persistent MongoDB donation storage
const db = require('./db');
const https = require('https');
const { MongoClient } = require('mongodb');

let cachedClient = null;

async function getMongoDonationsCollection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (cachedClient) {
    return cachedClient.db().collection('donations');
  }

  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return cachedClient.db().collection('donations');
}

async function saveDonation(donationRecord) {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    // When MongoDB is configured, save strictly to MongoDB. Never fallback to local JSON on failure.
    const mongoColl = await getMongoDonationsCollection();
    const recordToSave = {
      ...donationRecord,
      createdAt: new Date().toISOString()
    };
    const result = await mongoColl.insertOne(recordToSave);
    return { ...recordToSave, _id: result.insertedId };
  }
  // Local JSON store fallback ONLY when MONGODB_URI is not set (e.g. local test suite)
  return db.insert('donations', donationRecord);
}

async function getDonationsList() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    const mongoColl = await getMongoDonationsCollection();
    return await mongoColl.find({}).sort({ createdAt: -1 }).toArray();
  }
  return db.getCollection('donations');
}

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
      const donations = await getDonationsList();
      return res.status(200).json({ success: true, data: donations });
    }

    const accounts = db.getCollection('giving_accounts');
    const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_9e112e5e5b25fcf5f05b45bb6626bf308e80ac5b';

    return res.status(200).json({
      success: true,
      data: {
        accounts,
        onlinePayment: {
          enabled: Boolean(paystackPublicKey),
          provider: 'Paystack',
          publicKey: paystackPublicKey,
          note: 'Online giving is securely active via Paystack.'
        }
      }
    });
  }

  // RECORD DONATION OR VERIFY PAYSTACK
  if (req.method === 'POST') {
    const body = await parseBody(req);
    const { donorName, email, amount, currency, purpose, method, reference } = body;

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Please specify a valid giving amount in Naira (₦).'
      });
    }

    // 1. Direct Bank Transfer Notification Flow
    if (method === 'Bank Transfer') {
      const donationRecord = {
        donorName: (donorName || 'Beloved Giver').trim(),
        email: (email || '').trim(),
        amount: parsedAmount.toLocaleString(),
        currency: currency || 'NGN',
        purpose: purpose || 'Tithe / Offering',
        method: 'Bank Transfer',
        reference: reference || `TRF-${Date.now()}`,
        status: 'Bank Transfer Notified',
        date: new Date().toISOString().split('T')[0]
      };

      let donation;
      try {
        donation = await saveDonation(donationRecord);
      } catch (err) {
        console.error('MongoDB bank transfer insert error:', err);
        return res.status(500).json({
          success: false,
          verified: false,
          error: 'Transfer notification could not be recorded. Please contact the church office.'
        });
      }

      return res.status(201).json({
        success: true,
        verified: false,
        message: 'Thank you for notifying us of your transfer at Greater Grace Embassy Church International. God bless your giving!',
        data: donation
      });
    }

    // 2. Paystack Transaction Verification Flow
    if (!reference || typeof reference !== 'string' || !reference.trim()) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Paystack transaction reference is required for payment verification.'
      });
    }

    const trimmedReference = reference.trim();

    // Verify PAYSTACK_SECRET_KEY is present in environment
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('PAYSTACK_SECRET_KEY is not defined in environment variables.');
      return res.status(500).json({
        success: false,
        verified: false,
        error: 'Server payment gateway configuration error: PAYSTACK_SECRET_KEY is missing.'
      });
    }

    // Server-to-server verification request to Paystack API
    let verifyRes;
    try {
      verifyRes = await verifyPaystackServer(trimmedReference, secretKey);
    } catch (err) {
      console.error('Paystack verification network/server error:', err.message);
      return res.status(502).json({
        success: false,
        verified: false,
        error: 'Unable to reach Paystack verification service. Please try again.'
      });
    }

    // 1. Require Paystack verification status to be exactly "success"
    if (!verifyRes || !verifyRes.status || !verifyRes.data || verifyRes.data.status !== 'success') {
      const gatewayMsg = (verifyRes && verifyRes.data && verifyRes.data.gateway_response) || 
                         (verifyRes && verifyRes.message) || 
                         'Transaction status was not successful on Paystack.';
      return res.status(400).json({
        success: false,
        verified: false,
        error: `Paystack verification failed: ${gatewayMsg}`
      });
    }

    // 2. Verify returned amount exactly matches requested donation amount in kobo
    const expectedKobo = Math.round(parsedAmount * 100);
    const actualKobo = Number(verifyRes.data.amount);
    if (actualKobo !== expectedKobo) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: `Payment amount mismatch: Expected ₦${parsedAmount.toLocaleString()} (${expectedKobo} kobo), but Paystack processed ${actualKobo} kobo.`
      });
    }

    // 3. Verify returned currency is exactly "NGN"
    const actualCurrency = (verifyRes.data.currency || '').toUpperCase();
    if (actualCurrency !== 'NGN') {
      return res.status(400).json({
        success: false,
        verified: false,
        error: `Currency mismatch: Expected NGN, but Paystack returned ${actualCurrency || 'unknown'}.`
      });
    }

    // Save donation ONLY after all Paystack verification checks pass
    const donationRecord = {
      donorName: (donorName || (verifyRes.data.customer && `${verifyRes.data.customer.first_name || ''} ${verifyRes.data.customer.last_name || ''}`.trim()) || 'Beloved Giver').trim(),
      email: (email || (verifyRes.data.customer && verifyRes.data.customer.email) || '').trim(),
      amount: parsedAmount.toLocaleString(),
      currency: 'NGN',
      purpose: purpose || 'Tithe / Offering',
      method: method || 'Paystack Card/Bank',
      reference: trimmedReference,
      status: 'Verified Successful',
      date: new Date().toISOString().split('T')[0]
    };

    let donation;
    try {
      donation = await saveDonation(donationRecord);
    } catch (err) {
      console.error('MongoDB donation insert error:', err);
      return res.status(500).json({
        success: false,
        verified: false,
        error: 'Payment was verified, but the donation could not be permanently recorded. Please contact the church.'
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Thank you for honoring the Lord with your substance at Greater Grace Embassy Church International. Your payment has been verified. May God open the windows of heaven upon you!',
      data: donation
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

// api/newsletter.js
// Handles newsletter subscriptions, duplicate prevention, and unsubscribe functionality
const db = require('./db');

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

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // PUBLIC SUBSCRIPTION OR UNSUBSCRIBE
  if (req.method === 'POST') {
    const body = await parseBody(req);
    const { email, action } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const subscribers = db.getCollection('subscribers');

    // Handle Unsubscribe
    if (action === 'unsubscribe') {
      const existing = subscribers.find(s => s.email.toLowerCase() === cleanEmail);
      if (!existing) {
        return res.status(404).json({ error: 'This email address is not currently subscribed.' });
      }
      db.update('subscribers', existing.id, { active: false, unsubscribedAt: new Date().toISOString() });
      return res.status(200).json({
        success: true,
        message: 'You have been successfully unsubscribed from the church bulletin and updates.'
      });
    }

    // Handle Subscribe
    const existing = subscribers.find(s => s.email.toLowerCase() === cleanEmail);
    if (existing) {
      if (existing.active) {
        return res.status(200).json({
          success: true,
          message: 'You are already subscribed to the Greater Grace Embassy newsletter! God bless you.'
        });
      } else {
        // Re-activate
        db.update('subscribers', existing.id, { active: true, resubscribedAt: new Date().toISOString() });
        return res.status(200).json({
          success: true,
          message: 'Welcome back! Your subscription to the GGECI newsletter has been reactivated.'
        });
      }
    }

    // Insert new subscriber
    db.insert('subscribers', {
      email: cleanEmail,
      subscribedAt: new Date().toISOString(),
      active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for subscribing! You will receive our weekly grace bulletins, prophetic devotionals, and church announcements.'
    });
  }

  // ADMIN OPERATIONS
  const admin = getAdminUser(req);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized. Admin credentials required.' });
  }

  if (req.method === 'GET') {
    const subscribers = db.getCollection('subscribers');
    return res.status(200).json({ success: true, data: subscribers });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const id = url.searchParams.get('id') || (await parseBody(req)).id;
    if (!id) {
      return res.status(400).json({ error: 'Missing subscriber ID.' });
    }
    const deleted = db.delete('subscribers', id);
    if (!deleted) {
      return res.status(404).json({ error: 'Subscriber not found.' });
    }
    return res.status(200).json({ success: true, message: 'Subscriber removed.' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

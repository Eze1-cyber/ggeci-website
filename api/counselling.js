// api/counselling.js
// Handles confidential counselling and appointment booking for GGECI
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // PUBLIC BOOKING SUBMISSION
  if (req.method === 'POST') {
    const body = await parseBody(req);
    const { name, email, phone, preferredDate, preferredTime, counsellingType, message, honeypot } = body;

    if (honeypot) {
      return res.status(200).json({ success: true, message: 'Counselling request submitted.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please provide your full name.' });
    }
    if (!phone || phone.trim().length < 7) {
      return res.status(400).json({ error: 'Please provide a valid phone number so our pastoral office can reach you.' });
    }
    if (!preferredDate) {
      return res.status(400).json({ error: 'Please choose your preferred appointment date.' });
    }

    const item = db.insert('counselling_requests', {
      name: name.trim(),
      email: (email || '').trim(),
      phone: phone.trim(),
      preferredDate,
      preferredTime: preferredTime || 'Morning (10:00 AM - 1:00 PM)',
      counsellingType: counsellingType || 'General Spiritual Guidance',
      message: (message || '').trim(),
      status: 'pending',
      notes: ''
    });

    return res.status(201).json({
      success: true,
      message: 'Your counselling appointment request has been scheduled with the pastoral office. A pastor will contact you shortly to confirm.',
      id: item.id
    });
  }

  // ADMIN OPERATIONS
  const admin = getAdminUser(req);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized. Admin credentials required.' });
  }

  if (req.method === 'GET') {
    const appointments = db.getCollection('counselling_requests');
    return res.status(200).json({ success: true, data: appointments });
  }

  if (req.method === 'PATCH') {
    const body = await parseBody(req);
    const { id, status, notes } = body;
    if (!id) {
      return res.status(400).json({ error: 'Missing appointment ID.' });
    }
    const updates = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const updated = db.update('counselling_requests', id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    return res.status(200).json({ success: true, data: updated });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const id = url.searchParams.get('id') || (await parseBody(req)).id;
    if (!id) {
      return res.status(400).json({ error: 'Missing appointment ID.' });
    }
    const deleted = db.delete('counselling_requests', id);
    if (!deleted) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    return res.status(200).json({ success: true, message: 'Appointment deleted.' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

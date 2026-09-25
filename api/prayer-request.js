// api/prayer-request.js
// Handles confidential prayer requests for GGECI
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

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // PUBLIC SUBMISSION
  if (req.method === 'POST') {
    const body = await parseBody(req);
    const { name, email, phone, category, request, isConfidential, honeypot } = body;

    // Anti-spam bot check
    if (honeypot) {
      return res.status(200).json({ success: true, message: 'Prayer request submitted.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please provide your name.' });
    }
    if (!request || request.trim().length < 5) {
      return res.status(400).json({ error: 'Please share your prayer request so our prayer team can stand in faith with you.' });
    }

    const item = db.insert('prayer_requests', {
      name: name.trim(),
      email: (email || '').trim(),
      phone: (phone || '').trim(),
      category: category || 'General Prayer',
      request: request.trim(),
      isConfidential: Boolean(isConfidential),
      status: 'pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Your prayer request has been received. Our pastoral prayer team is standing with you in agreement and faith. May God\'s grace prevail in your life!',
      id: item.id
    });
  }

  // ADMIN OPERATIONS
  const admin = getAdminUser(req);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
  }

  if (req.method === 'GET') {
    const requests = db.getCollection('prayer_requests');
    return res.status(200).json({ success: true, data: requests });
  }

  if (req.method === 'PATCH') {
    const body = await parseBody(req);
    const { id, status } = body;
    if (!id || !status) {
      return res.status(400).json({ error: 'Missing prayer request ID or status.' });
    }
    const updated = db.update('prayer_requests', id, { status });
    if (!updated) {
      return res.status(404).json({ error: 'Prayer request not found.' });
    }
    return res.status(200).json({ success: true, data: updated });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const id = url.searchParams.get('id') || (await parseBody(req)).id;
    if (!id) {
      return res.status(400).json({ error: 'Missing prayer request ID to delete.' });
    }
    const deleted = db.delete('prayer_requests', id);
    if (!deleted) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    return res.status(200).json({ success: true, message: 'Prayer request deleted successfully.' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

// api/contact.js
// Handles visitor contact form submissions and admin message management
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

  // PUBLIC CONTACT SUBMISSION
  if (req.method === 'POST') {
    const body = await parseBody(req);
    const { name, email, phone, subject, message, honeypot } = body;

    if (honeypot) {
      return res.status(200).json({ success: true, message: 'Thank you for reaching out.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please enter your name.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!message || message.trim().length < 5) {
      return res.status(400).json({ error: 'Please enter your message.' });
    }

    const item = db.insert('contacts', {
      name: name.trim(),
      email: email.trim(),
      phone: (phone || '').trim(),
      subject: (subject || 'General Inquiry').trim(),
      message: message.trim(),
      status: 'unread'
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for contacting Greater Grace Embassy Church International. We have received your message and will respond promptly.',
      id: item.id
    });
  }

  // ADMIN OPERATIONS
  const admin = getAdminUser(req);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized. Admin credentials required.' });
  }

  if (req.method === 'GET') {
    const messages = db.getCollection('contacts');
    return res.status(200).json({ success: true, data: messages });
  }

  if (req.method === 'PATCH') {
    const body = await parseBody(req);
    const { id, status } = body;
    if (!id || !status) {
      return res.status(400).json({ error: 'Missing message ID or status.' });
    }
    const updated = db.update('contacts', id, { status });
    if (!updated) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    return res.status(200).json({ success: true, data: updated });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const id = url.searchParams.get('id') || (await parseBody(req)).id;
    if (!id) {
      return res.status(400).json({ error: 'Missing message ID.' });
    }
    const deleted = db.delete('contacts', id);
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    return res.status(200).json({ success: true, message: 'Message deleted successfully.' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

// api/events.js
// Handles church events calendar, registrations, and admin management
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const admin = getAdminUser(req);

  // GET EVENTS
  if (req.method === 'GET') {
    const allEvents = db.getCollection('events');
    const visibleEvents = admin
      ? allEvents
      : allEvents.filter(e => e.status === 'published');
    return res.status(200).json({ success: true, data: visibleEvents });
  }

  const body = await parseBody(req);

  // PUBLIC RSVP / EVENT REGISTRATION
  if (req.method === 'POST' && body.action === 'register') {
    const { eventId, name, email, phone, attendees } = body;
    if (!eventId || !name || !phone) {
      return res.status(400).json({ error: 'Please provide event, full name, and phone number.' });
    }
    const event = db.getItem('events', eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    const registrations = event.registrations || [];
    const newRegistration = {
      id: `reg-${Date.now()}`,
      name: name.trim(),
      email: (email || '').trim(),
      phone: phone.trim(),
      attendees: parseInt(attendees, 10) || 1,
      registeredAt: new Date().toISOString()
    };
    registrations.push(newRegistration);
    db.update('events', eventId, { registrations });

    return res.status(201).json({
      success: true,
      message: `Registration confirmed for ${event.title}! We look forward to fellowship with you.`,
      data: newRegistration
    });
  }

  // ALL REMAINING METHODS REQUIRE ADMIN
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized. Admin credentials required.' });
  }

  if (req.method === 'POST') {
    const { title, date, time, location, description, speaker, category, image, status } = body;

    if (!title || !date || !time) {
      return res.status(400).json({ error: 'Event title, date, and time are required.' });
    }

    const event = db.insert('events', {
      title: title.trim(),
      date: date.trim(),
      time: time.trim(),
      location: location || '1, Taiwo Adewole Street, Off Social Club Road, Abule-Egba, Lagos',
      description: (description || '').trim(),
      speaker: (speaker || 'Pastoral Board').trim(),
      category: category || 'Special Service',
      image: image || '/assets/images/hero-bg.jpg',
      status: status === 'draft' ? 'draft' : 'published',
      registrations: []
    });

    return res.status(201).json({ success: true, message: 'Event created successfully.', data: event });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { id, ...updates } = body;
    if (!id) {
      return res.status(400).json({ error: 'Missing event ID.' });
    }
    const updated = db.update('events', id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    return res.status(200).json({ success: true, message: 'Event updated successfully.', data: updated });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const id = url.searchParams.get('id') || body.id;
    if (!id) {
      return res.status(400).json({ error: 'Missing event ID.' });
    }
    const deleted = db.delete('events', id);
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    return res.status(200).json({ success: true, message: 'Event deleted successfully.' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

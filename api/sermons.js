// api/sermons.js
// Handles sermon retrieval for public and CRUD management for admin
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

  // GET SERMONS
  if (req.method === 'GET') {
    const allSermons = db.getCollection('sermons');
    // If admin is logged in, return all (published and draft); otherwise only published
    const visibleSermons = admin
      ? allSermons
      : allSermons.filter(s => s.status === 'published');
    return res.status(200).json({ success: true, data: visibleSermons });
  }

  // ALL OTHER METHODS REQUIRE ADMIN
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized. Admin credentials required.' });
  }

  if (req.method === 'POST') {
    const body = await parseBody(req);
    const { title, speaker, date, scripture, description, audioUrl, videoUrl, category, thumbnail, status } = body;

    if (!title || !speaker || !date) {
      return res.status(400).json({ error: 'Title, speaker, and date are required.' });
    }

    const sermon = db.insert('sermons', {
      title: title.trim(),
      speaker: speaker.trim(),
      date,
      scripture: (scripture || '').trim(),
      description: (description || '').trim(),
      audioUrl: (audioUrl || '').trim(),
      videoUrl: (videoUrl || '').trim(),
      category: category || 'Sunday Message',
      thumbnail: thumbnail || '/images/sermon-banner.jpg',
      status: status === 'draft' ? 'draft' : 'published'
    });

    return res.status(201).json({ success: true, message: 'Sermon created successfully.', data: sermon });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const body = await parseBody(req);
    const { id, ...updates } = body;
    if (!id) {
      return res.status(400).json({ error: 'Missing sermon ID.' });
    }
    const updated = db.update('sermons', id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Sermon not found.' });
    }
    return res.status(200).json({ success: true, message: 'Sermon updated successfully.', data: updated });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const id = url.searchParams.get('id') || (await parseBody(req)).id;
    if (!id) {
      return res.status(400).json({ error: 'Missing sermon ID.' });
    }
    const deleted = db.delete('sermons', id);
    if (!deleted) {
      return res.status(404).json({ error: 'Sermon not found.' });
    }
    return res.status(200).json({ success: true, message: 'Sermon deleted successfully.' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};


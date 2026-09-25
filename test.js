// test.js
// Automated verification suite for Greater Grace Embassy Church International (GGECI)

const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk.toString(); });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING GGECI AUTOMATED PRODUCTION VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`PASS: ${message}`);
      passed++;
    } else {
      console.error(`FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Static HTML Pages Check
    const publicPages = [
      '/',
      '/index.html',
      '/about.html',
      '/sermons.html',
      '/events.html',
      '/prayer-request.html',
      '/giving.html',
      '/contact.html',
      '/counselling.html',
      '/newsletter.html'
    ];

    for (const page of publicPages) {
      const res = await makeRequest('GET', page);
      assert(res.status === 200, `Public page ${page} returns HTTP 200`);
    }

    // 2. Assert Admin Login & Dashboard are completely removed (404)
    const loginRes = await makeRequest('GET', '/admin/login.html');
    assert(loginRes.status === 404, 'Admin login page /admin/login.html is completely removed (returns 404)');

    const dashboardRes = await makeRequest('GET', '/admin/dashboard.html');
    assert(dashboardRes.status === 404, 'Admin dashboard /admin/dashboard.html is completely removed (returns 404)');

    const adminLoginApi = await makeRequest('POST', '/api/admin/login', { username: 'admin' });
    assert(adminLoginApi.status === 404, 'Admin login API /api/admin/login is completely removed (returns 404)');

    // 3. Public Sermons API
    const sermonsRes = await makeRequest('GET', '/api/sermons');
    assert(sermonsRes.status === 200 && sermonsRes.data.success, 'GET /api/sermons succeeds');
    assert(Array.isArray(sermonsRes.data.data) && sermonsRes.data.data.length > 0, 'Sermons list populated');
    const allPublished = sermonsRes.data.data.every(s => s.status === 'published');
    assert(allPublished, 'Public sermons endpoint ONLY returns published sermons');

    // 4. Public Events API
    const eventsRes = await makeRequest('GET', '/api/events');
    assert(eventsRes.status === 200 && eventsRes.data.success, 'GET /api/events succeeds');
    assert(Array.isArray(eventsRes.data.data) && eventsRes.data.data.length > 0, 'Events list populated');

    // 5. Prayer Request Submission (no account required)
    const prayerRes = await makeRequest('POST', '/api/prayer-request', {
      name: 'Sister Comfort Blessing',
      email: 'comfort@example.com',
      phone: '+234 803 999 0000',
      category: 'Healing & Health',
      request: 'Praying for divine health and strength in my family in Lagos.',
      isConfidential: true
    });
    assert(prayerRes.status === 201 && prayerRes.data.success, 'POST /api/prayer-request succeeds');

    // Reject empty prayer
    const badPrayer = await makeRequest('POST', '/api/prayer-request', { name: '', request: '' });
    assert(badPrayer.status === 400, 'POST /api/prayer-request rejects empty submission with 400');

    // 6. Contact Form Submission
    const contactRes = await makeRequest('POST', '/api/contact', {
      name: 'Brother David',
      email: 'david@example.com',
      phone: '+234 812 345 6789',
      subject: 'Inquiry about Wednesday Service',
      message: 'Hello church, I would like to attend this Wednesday service.'
    });
    assert(contactRes.status === 201 && contactRes.data.success, 'POST /api/contact succeeds');

    // 7. Counselling Booking
    const counselRes = await makeRequest('POST', '/api/counselling', {
      name: 'Brother Peter',
      phone: '+234 703 111 2233',
      preferredDate: '2026-10-15',
      preferredTime: 'Morning (10:00 AM - 1:00 PM)',
      counsellingType: 'Career & Destiny',
      message: 'Need spiritual guidance regarding career transition.'
    });
    assert(counselRes.status === 201 && counselRes.data.success, 'POST /api/counselling booking succeeds');

    // 8. Newsletter Subscription & Duplicate Prevention
    const testEmail = `subscriber_${Date.now()}@example.com`;
    const newsRes = await makeRequest('POST', '/api/newsletter', { email: testEmail });
    assert(newsRes.status === 201 && newsRes.data.success, 'POST /api/newsletter subscribes new email');

    const newsDupRes = await makeRequest('POST', '/api/newsletter', { email: testEmail });
    assert(newsDupRes.status === 200 && newsDupRes.data.success, 'POST /api/newsletter handles duplicate gracefully');

    // 9. Online Giving Info (Verify no secret keys exposed)
    const givingRes = await makeRequest('GET', '/api/giving');
    assert(givingRes.status === 200 && givingRes.data.success, 'GET /api/giving returns church bank accounts');
    assert(Array.isArray(givingRes.data.data.accounts) && givingRes.data.data.accounts.length >= 1, 'Bank accounts list complete');
    assert(!givingRes.data.data.secretKey && !givingRes.data.data.paystackSecretKey, 'Secret payment keys are NEVER exposed in API response');

    console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();

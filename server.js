// server.js
// Standalone local development server for Greater Grace Embassy Church International (GGECI)
// Emulates Vercel static file serving and serverless /api routes with ZERO external dependencies

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=UTF-8'
};

// API Handler mapping
const API_ROUTES = {
  '/api/prayer-request': './api/prayer-request.js',
  '/api/contact': './api/contact.js',
  '/api/counselling': './api/counselling.js',
  '/api/sermons': './api/sermons.js',
  '/api/events': './api/events.js',
  '/api/newsletter': './api/newsletter.js',
  '/api/giving': './api/giving.js'
};

// Enhance res with standard Vercel helper functions
function enhanceResponse(res) {
  res.status = function (statusCode) {
    res.statusCode = statusCode;
    return res;
  };
  res.json = function (data) {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(data));
    return res;
  };
  res.send = function (data) {
    res.end(data);
    return res;
  };
}

const server = http.createServer(async (req, res) => {
  enhanceResponse(res);
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. Check if route matches an API endpoint
  for (const [routePath, moduleFile] of Object.entries(API_ROUTES)) {
    if (pathname === routePath || pathname.startsWith(routePath + '/')) {
      try {
        const handlerPath = path.resolve(__dirname, moduleFile);
        delete require.cache[require.resolve(handlerPath)]; // Clean reload in dev
        const handler = require(handlerPath);
        return await handler(req, res);
      } catch (err) {
        console.error(`Error handling ${pathname}:`, err);
        return res.status(500).json({ error: 'Internal Server Error', details: err.message });
      }
    }
  }

  // 2. Direct static handling for /images/ and /css/ assets
  if (pathname.startsWith('/images/')) {
    const imgPath = path.join(__dirname, pathname);
    return fs.stat(imgPath, (err, stats) => {
      if (!err && stats.isFile()) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return serveFile(imgPath, res);
      }
      res.status(404).setHeader('Content-Type', 'text/plain');
      return res.end('Image Not Found');
    });
  }

  if (pathname.startsWith('/css/') || pathname.endsWith('.css')) {
    const cssPath = path.join(__dirname, pathname);
    return fs.stat(cssPath, (err, stats) => {
      if (!err && stats.isFile()) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return serveFile(cssPath, res);
      }
      res.status(404).setHeader('Content-Type', 'text/plain');
      return res.end('CSS File Not Found');
    });
  }

  // 3. General static file serving with clean URLs
  let filePath = path.join(PUBLIC_DIR, pathname);

  // If path is root or folder
  if (pathname === '/') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  // Check if file exists as-is
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      return serveFile(filePath, res);
    }

    // Try appending .html (clean URL support)
    const htmlPath = filePath + '.html';
    fs.stat(htmlPath, (htmlErr, htmlStats) => {
      if (!htmlErr && htmlStats.isFile()) {
        return serveFile(htmlPath, res);
      }

      // Check if folder contains index.html
      const folderIndex = path.join(filePath, 'index.html');
      fs.stat(folderIndex, (idxErr, idxStats) => {
        if (!idxErr && idxStats.isFile()) {
          return serveFile(folderIndex, res);
        }

        // 404 Not Found
        res.status(404).setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>Page Not Found - GGECI</title>
            <link rel="stylesheet" href="/css/style.css">
          </head>
          <body style="display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:100vh; text-align:center; padding:20px;">
            <h1>404 - Page Not Found</h1>
            <p style="margin: 16px 0 24px;">The page you are looking for does not exist on Greater Grace Embassy Church International.</p>
            <a href="/" class="btn btn-primary">Return to Homepage</a>
          </body>
          </html>
        `);
      });
    });
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(500).setHeader('Content-Type', 'text/plain');
      return res.end('Error reading file');
    }
    res.setHeader('Content-Type', contentType);
    res.end(data);
  });
}

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Greater Grace Embassy Church International (GGECI)`);
    console.log(` Production Ready Server active at: http://localhost:${PORT}`);
    console.log(` Website URL: http://localhost:${PORT}/`);
    console.log(`=======================================================`);
  });
}

module.exports = server;

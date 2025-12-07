// gps-proxy.js
const express = require('express');
const fetch = require('node-fetch'); // v2
const app = express();

app.use(express.json()); // parse application/json

// Simple CORS - allow local testing from browser
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // adjust for production
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Config - put your token & default device id here
const DEFAULT_TOKEN = '6d4e5b472c71bdea160570b14cd48342'; // replace if needed
const DEFAULT_DEVICE = '865167048531801'; // replace if needed
const BASE = 'https://gps51.com/webapi';

// Helper to fetch and return JSON (or raw text)
async function fetchJson(url, options = {}) {
  try {
    const r = await fetch(url, options);
    const cType = (r.headers.get('content-type') || '').toLowerCase();
    const text = await r.text();
    // try parse as JSON when content-type says JSON or when text looks like JSON
    if (cType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const json = JSON.parse(text);
        return { ok: true, json, raw: text, status: r.status, contentType: cType };
      } catch (e) {
        // fell through to raw
        return { ok: false, raw: text, status: r.status, contentType: cType, parseError: e.message };
      }
    }
    return { ok: false, raw: text, status: r.status, contentType: cType };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * GET /api/poibatch
 * Proxy to GPS51 POI batch endpoint (GET)
 */
app.get('/api/poibatch', async (req, res) => {
  try {
    // Use query token override if provided in request; else default
    const token = req.query.token || DEFAULT_TOKEN;
    const serverid = req.query.serverid || '0';
    const extend = req.query.extend || 'self';

    const url = `${BASE}?action=poibatch&token=${encodeURIComponent(token)}&extend=${encodeURIComponent(extend)}&serverid=${encodeURIComponent(serverid)}`;

    console.log('Sending to GPS51:', url);
    const result = await fetchJson(url, { method: 'GET' });

    if (result.ok && result.json) {
      return res.json(result.json);
    }
    // return raw text as fallback
    res.status(result.status || 200).type('text/plain').send(result.raw || result.error || 'Unknown error');
  } catch (err) {
    console.error('poibatch error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

/**
 * POST /api/lastposition
 * Proxy to GPS51 lastposition endpoint. We force streamtype=json so we get JSON response.
 *
 * Request body should be JSON, e.g.
 * {
 *   "username": "UP32PM6481",
 *   "deviceids": ["865167048531801"],
 *   "lastquerypositiontime": 1765102000000
 * }
 *
 * Or you can send without body; proxy will send default device id.
 */
app.post('/api/lastposition', async (req, res) => {
  try {
    const token = req.query.token || DEFAULT_TOKEN;
    const serverid = req.query.serverid || '0';
    const extend = req.query.extend || 'self';

    // Prepare payload: use provided body or fallback to default device
    const payload = (req.body && Object.keys(req.body).length) ? req.body : {
      username: 'proxy',
      deviceids: [DEFAULT_DEVICE],
    };

    const url = `${BASE}?action=lastposition&streamtype=json&token=${encodeURIComponent(token)}&extend=${encodeURIComponent(extend)}&serverid=${encodeURIComponent(serverid)}`;

    console.log('Sending to GPS51:', url);
    console.log(' Body:', JSON.stringify(payload));

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // optionally set Referer/User-Agent if needed
        //'Referer': 'https://gps51.com/',
      },
      body: JSON.stringify(payload),
    });

    const contentType = (r.headers.get('content-type') || '').toLowerCase();
    const text = await r.text();

    // If JSON, parse and return as JSON
    if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const json = JSON.parse(text);
        console.log('GPS51 response JSON:', json);
        return res.json(json);
      } catch (e) {
        // fallback
        console.warn('Failed parsing JSON from GPS51:', e.message);
        return res.status(200).type('text/plain').send(text);
      }
    }

    // fallback: return raw text
    res.status(r.status || 200).type('text/plain').send(text);
  } catch (err) {
    console.error('lastposition error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GPS proxy running on http://localhost:${PORT}`);
});

// gps-proxy.js
// Simple proxy for GPS51 "lastposition" + a couple of helper endpoints.
// - Reads secrets from environment variables (GPS51_TOKEN, GPS51_BASE, DEFAULT_DEVICE)
// - Returns JSON when upstream returns JSON; otherwise returns raw text.
// - Logs helpful debug lines.

const express = require('express');
const fetch = require('node-fetch'); // v2 (install node-fetch@2)
const app = express();

app.use(express.json({ limit: '1mb' })); // parse application/json

// Simple CORS (adjust for production)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // change to your domain in production
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Config via env
const GPS51_TOKEN = process.env.GPS51_TOKEN || process.env.BASE_TOKEN || '';
const DEFAULT_DEVICE = process.env.DEFAULT_DEVICE || '865167048531801';
const GPS51_BASE = process.env.GPS51_BASE || 'https://gps51.com/webapi';
const DEFAULT_SERVERID = process.env.SERVER_ID || '0';
const PORT = process.env.PORT || 3000;

// small helper to log
function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

// fetch helper that returns { ok, json?, raw?, status, contentType, error? }
async function fetchText(url, options = {}) {
  try {
    const r = await fetch(url, options);
    const contentType = (r.headers.get('content-type') || '').toLowerCase();
    const text = await r.text();
    if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const json = JSON.parse(text);
        return { ok: true, json, raw: text, status: r.status, contentType };
      } catch (err) {
        // parse failed
        return { ok: false, raw: text, status: r.status, contentType, parseError: err.message };
      }
    }
    return { ok: false, raw: text, status: r.status, contentType };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * GET /api/poibatch - example GET proxy
 */
app.get('/api/poibatch', async (req, res) => {
  try {
    const token = req.query.token || GPS51_TOKEN;
    const serverid = req.query.serverid || DEFAULT_SERVERID;
    const extend = req.query.extend || 'self';

    if (!token) {
      return res.status(400).json({ error: 'Missing token. Set GPS51_TOKEN env or pass ?token=' });
    }

    // GPS51 expects query string parameters, example: ?action=poibatch&token=...
    const url = `${GPS51_BASE}?action=poibatch&token=${encodeURIComponent(token)}&extend=${encodeURIComponent(extend)}&serverid=${encodeURIComponent(serverid)}`;
    log('GET -> GPS51', url);
    const result = await fetchText(url, { method: 'GET' });

    if (result.ok && result.json) return res.json(result.json);
    // fallback to text
    return res.status(result.status || 200).type('text/plain').send(result.raw || result.error || 'Unknown');
  } catch (err) {
    log('poibatch error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

/**
 * POST /api/lastposition
 * - Accepts JSON body like { deviceids: ["id1","id2"], username: "...", lastquerypositiontime: 176... }
 * - Falls back to DEFAULT_DEVICE if no body provided.
 * - Returns JSON when possible.
 */
app.post('/api/lastposition', async (req, res) => {
  try {
    const token = req.query.token || GPS51_TOKEN;
    const serverid = req.query.serverid || DEFAULT_SERVERID;
    const extend = req.query.extend || 'self';

    if (!token) {
      return res.status(400).json({ error: 'Missing token. Set GPS51_TOKEN env or pass ?token=' });
    }

    // Use provided body if any, else default payload
    const incoming = (req.body && Object.keys(req.body).length) ? req.body : null;
    const payload = incoming || { username: 'proxy', deviceids: [DEFAULT_DEVICE] };

    // Build URL with action + streamtype=json (we force JSON when possible)
    const url = `${GPS51_BASE}?action=lastposition&streamtype=json&token=${encodeURIComponent(token)}&extend=${encodeURIComponent(extend)}&serverid=${encodeURIComponent(serverid)}`;

    log('POST -> GPS51', url);
    log('POST body:', JSON.stringify(payload));

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      // optionally set timeout using AbortController in advanced deployments
    });

    const contentType = (r.headers.get('content-type') || '').toLowerCase();
    const text = await r.text();

    // Try to parse JSON if possible
    if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const json = JSON.parse(text);
        // Optionally augment result with metadata for debugging (not sensitive)
        const meta = {
          _proxy: {
            requestedDeviceIds: Array.isArray(payload.deviceids) ? payload.deviceids : [payload.deviceids],
            serverid,
            extend,
            upstreamStatus: r.status,
          }
        };
        // if upstream is JSON object, merge meta under _proxy
        if (typeof json === 'object' && json !== null) {
          json._proxy = meta._proxy;
        }
        log('GPS51 returned JSON, records count:', (json && json.records && json.records.length) || 0);
        return res.json(json);
      } catch (e) {
        log('Failed parse JSON from GPS51:', e.message);
        return res.status(200).type('text/plain').send(text);
      }
    }

    // fallback: return raw text
    res.status(r.status || 200).type('text/plain').send(text);

  } catch (err) {
    log('lastposition error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Root health
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'gps-proxy',
    env: { defaultDevice: DEFAULT_DEVICE, hasToken: Boolean(GPS51_TOKEN), gps51Base: GPS51_BASE }
  });
});

app.listen(PORT, () => {
  log(`GPS proxy running on port ${PORT}`);
});

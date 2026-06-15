/* analytics.js — lightweight, zero-dependency site view tracking.
 *
 * Counts real page views across the whole site plus blog-post opens, and keeps a
 * privacy-friendly per-day count of unique visitors (salted hash of IP+UA, never
 * the raw IP). Everything is held in memory and flushed to a small JSON file
 * (data/analytics.json) on a debounce, so it survives restarts without any
 * database or build step. The blog backend pulls a weekly summary from
 * GET /api/stats to email admin@mawinguhrsolutions.co.ke.
 *
 * No npm dependencies — only Node built-ins (fs, path, crypto).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.ANALYTICS_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'analytics.json');
const RETAIN_DAYS = 90;                       // drop day buckets older than this
const SALT = process.env.ANALYTICS_SALT || 'mawingu-hr-analytics-v1';
const STATS_TOKEN = process.env.STATS_TOKEN || '';

// Page routes worth counting as a "view". Anything else (assets, /api/*, 404s,
// probes) is ignored so the numbers reflect real visitors.
const PAGE_ROUTES = new Set([
  '/', '/about', '/corporate-services', '/professional-services', '/blog', '/contact',
]);
const PAGE_LABELS = {
  '/': 'Home',
  '/about': 'About',
  '/corporate-services': 'Corporate Services',
  '/professional-services': 'Professional Services',
  '/blog': 'Blog',
  '/contact': 'Contact',
};

const BOT_RE = /bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebookexternalhit|whatsapp|telegram|preview|monitor|pingdom|uptime|headless|curl|wget|python-requests|axios|node-fetch/i;

let state = { days: {} };
// In-memory Sets of seen visitor hashes per day, for fast O(1) unique lookups.
// Rebuilt from the persisted `seen` arrays on load.
const seenSets = Object.create(null);
let saveTimer = null;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ }
}

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.days) {
      state = parsed;
    }
  } catch (_) {
    state = { days: {} };
  }
  // Rebuild the fast-lookup Sets and normalise buckets.
  for (const [d, b] of Object.entries(state.days)) {
    b.pageviews = b.pageviews || 0;
    b.uniques = b.uniques || 0;
    b.pages = b.pages || {};
    b.posts = b.posts || {};
    b.seen = Array.isArray(b.seen) ? b.seen : [];
    seenSets[d] = new Set(b.seen);
  }
  prune();
}

function prune() {
  const cutoff = dateNDaysAgo(RETAIN_DAYS);
  for (const d of Object.keys(state.days)) {
    if (d < cutoff) {
      delete state.days[d];
      delete seenSets[d];
    }
  }
}

function dateNDaysAgo(n) {
  const ms = Date.now() - n * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    save();
  }, 5000);
  if (saveTimer.unref) saveTimer.unref();
}

function save() {
  try {
    ensureDir();
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error('analytics: failed to persist', err.message);
  }
}

function bucket(d) {
  if (!state.days[d]) {
    state.days[d] = { pageviews: 0, uniques: 0, pages: {}, posts: {}, seen: [] };
    seenSets[d] = new Set();
  }
  return state.days[d];
}

function clientIp(req) {
  const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || (req.socket && req.socket.remoteAddress) || '';
}

function visitorHash(req, d) {
  const ip = clientIp(req);
  const ua = req.headers['user-agent'] || '';
  return crypto
    .createHash('sha256')
    .update(`${SALT}|${d}|${ip}|${ua}`)
    .digest('hex')
    .slice(0, 16);
}

function markVisitor(req, d, b) {
  const h = visitorHash(req, d);
  const set = seenSets[d] || (seenSets[d] = new Set(b.seen));
  if (!set.has(h)) {
    set.add(h);
    b.seen.push(h);
    b.uniques += 1;
  }
}

// Express middleware: count a page view for known page routes only.
function middleware(req, res, next) {
  try {
    if (req.method === 'GET' && PAGE_ROUTES.has(req.path)) {
      const ua = req.headers['user-agent'] || '';
      if (!BOT_RE.test(ua)) {
        const d = today();
        const b = bucket(d);
        b.pageviews += 1;
        b.pages[req.path] = (b.pages[req.path] || 0) + 1;
        markVisitor(req, d, b);
        scheduleSave();
      }
    }
  } catch (err) {
    console.error('analytics middleware error', err.message);
  }
  next();
}

// Record a blog-post open (fired by a client beacon when the post modal opens).
function recordPostView(req, id, title) {
  if (!id) return;
  const ua = req.headers['user-agent'] || '';
  if (BOT_RE.test(ua)) return;
  const d = today();
  const b = bucket(d);
  const key = String(id);
  const cur = b.posts[key] || { title: '', views: 0 };
  cur.views += 1;
  if (title) cur.title = String(title).slice(0, 200);
  b.posts[key] = cur;
  // A post open also counts as activity from a visitor.
  markVisitor(req, d, b);
  scheduleSave();
}

// Aggregate the last `days` day-buckets into a summary for the weekly email.
function getStats(days) {
  const n = Math.max(1, Math.min(parseInt(days, 10) || 7, RETAIN_DAYS));
  const cutoff = dateNDaysAgo(n - 1); // inclusive of today
  let totalViews = 0;
  let uniqueVisits = 0;
  const pages = {};
  const posts = {};

  for (const [d, b] of Object.entries(state.days)) {
    if (d < cutoff) continue;
    totalViews += b.pageviews || 0;
    uniqueVisits += b.uniques || 0;
    for (const [p, c] of Object.entries(b.pages || {})) {
      pages[p] = (pages[p] || 0) + c;
    }
    for (const [id, info] of Object.entries(b.posts || {})) {
      if (!posts[id]) posts[id] = { title: info.title || id, views: 0 };
      posts[id].views += info.views || 0;
      if (info.title) posts[id].title = info.title;
    }
  }

  const topPages = Object.entries(pages)
    .map(([p, views]) => ({ path: p, label: PAGE_LABELS[p] || p, views }))
    .sort((a, b) => b.views - a.views);

  const topPosts = Object.entries(posts)
    .map(([id, info]) => ({ id, title: info.title, views: info.views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return {
    rangeDays: n,
    from: cutoff,
    to: today(),
    totalViews,
    uniqueVisits, // sum of per-day uniques ≈ visits (a person is counted once per day)
    topPages,
    topPosts,
  };
}

function statsTokenOk(req) {
  if (!STATS_TOKEN) return true; // not configured → open (still only read-only aggregates)
  const provided = req.query.token || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return provided === STATS_TOKEN;
}

// Read a small JSON/text body regardless of content-type (sendBeacon sends
// text/plain or a Blob), with a hard size cap.
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    let tooBig = false;
    req.on('data', (c) => {
      data += c;
      if (data.length > 16 * 1024) { tooBig = true; req.destroy(); }
    });
    req.on('end', () => {
      if (tooBig) return resolve({});
      try { resolve(JSON.parse(data || '{}')); } catch (_) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

// Wire the two analytics routes onto an Express app.
function mount(app) {
  app.use(middleware);

  // Client beacon for blog-post opens: POST /api/track { type:'post', id, title }
  app.post('/api/track', async (req, res) => {
    const body = await readBody(req);
    if (body && body.type === 'post') {
      recordPostView(req, body.id, body.title);
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(204).end();
  });

  // Token-protected weekly summary consumed by the blog backend's report job.
  app.get('/api/stats', (req, res) => {
    if (!statsTokenOk(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(getStats(req.query.days || 7));
  });
}

load();

module.exports = { mount, middleware, recordPostView, getStats };

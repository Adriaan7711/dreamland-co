/* ==========================================================================
   Dreamland Leads – service worker
   Keeps the app's own files (pages, script, styles, icons) on the device so
   the app opens quickly and still opens with a poor signal.

   - Only files from this website are handled. Supabase (leads, logins) and
     the code libraries from other sites are never touched or stored here.
   - Every open asks the website for the latest files first, so a pushed
     update shows up on the next open. The stored copy is only used when the
     network is slow (over 4 seconds) or offline.
   ========================================================================== */

const CACHE = 'dreamland-leads-v1';
const SHELL = [
  './',
  'index.html',
  'app.js?v=3',
  'config.js?v=3',
  'leads.css?v=3',
  'signature.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  '../css/style.css',
  '../js/data.js?v=3',
  '../favicon.svg',
  '../images/email-logo.png'
];
const TIMEOUT = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'no-cache' }))))
      .catch(() => { /* a missing file mustn't stop the app from installing */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The app's own files: same website, and either inside /leads/ or one of the shared
// site files listed above. Everything else goes straight to the network as normal.
const shared = SHELL.filter((u) => u.startsWith('../')).map((u) => new URL(u, self.registration.scope).pathname);
const scopePath = new URL(self.registration.scope).pathname;

function isAppFile(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.endsWith('/sw.js')) return false;
  return url.pathname.startsWith(scopePath) || shared.includes(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!isAppFile(url)) return;
  event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  // "no-cache" checks with the website for a newer version (GitHub Pages
  // otherwise lets browsers reuse a file for 10 minutes).
  const fresh = fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  });
  const slow = new Promise((resolve) => setTimeout(resolve, TIMEOUT));
  try {
    const res = await Promise.race([fresh, slow]);
    if (res) return res;
  } catch (err) { /* offline: fall back to the stored copy */ }
  const stored = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
  return stored || fresh;
}

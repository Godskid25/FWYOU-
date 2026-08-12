// F.W.Y. service worker — enables install + basic offline support.
// Bump this version string whenever you deploy changes so old caches get cleared.
const CACHE_NAME = 'fwy-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Never intercept calls to Supabase or other APIs — those must always hit
//   the network live (this app's data is real-time, not cacheable).
// - For everything else (the app shell itself), try the network first so
//   users always get the latest deployed version; fall back to cache only
//   when offline.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests for same-origin app files.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

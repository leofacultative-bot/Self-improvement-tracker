const CACHE = 'si-tracker-v4';
const PRECACHE = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// On install: cache everything immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// On activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first (serve from cache, update in background)
self.addEventListener('fetch', e => {
  // Only handle same-origin requests
  if (!e.request.url.startsWith(self.location.origin)) {
    // For Google Fonts and other CDN — try network, fall back silently
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 408})));
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      if (cached) {
        // Serve from cache immediately, refresh in background
        fetch(e.request).then(resp => {
          if (resp && resp.status === 200) cache.put(e.request, resp.clone());
        }).catch(() => {});
        return cached;
      }
      // Not in cache — try network and cache it
      try {
        const resp = await fetch(e.request);
        if (resp && resp.status === 200) cache.put(e.request, resp.clone());
        return resp;
      } catch {
        return new Response('Offline', {status: 503, statusText: 'Offline'});
      }
    })
  );
});

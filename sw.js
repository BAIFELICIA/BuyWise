const CACHE = 'buywise-v2';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/']))));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(found => found || fetch(event.request))));

const CACHE_NAME = 'aulia-v2'; // Ganti versi jika ada update besar
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/auth.js',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Install Service Worker dan cache file dasar
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache dibuka');
      return cache.addAll(urlsToCache);
    }).catch(err => console.log('Cache add error:', err))
  );
});

// Aktivasi dan hapus cache lama
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch: Sajikan dari cache kalau ada, kalau tidak ambil dari internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response; // Kembalikan dari cache
      }
      return fetch(event.request).then(fetchResponse => {
        // Cek kalau response valid
        if(!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
          return fetchResponse;
        }
        // Clone response karena stream hanya bisa dipakai sekali
        const responseToCache = fetchResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return fetchResponse;
      }).catch(() => {
        // Kalau gagal fetch (offline) dan buka halaman lain, tampilkan index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

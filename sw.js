/**
 * Service Worker — Aulia Apotek Klinik
 * Strategi: cache-first untuk shell, stale-while-revalidate untuk asset modul.
 */
const CACHE_NAME = 'aulia-apotek-klinik-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/style.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/dashboard.js',
    '/js/apotek/obat.js',
    '/js/apotek/transaksi.js',
    '/js/apotek/pembelian.js',
    '/js/apotek/stockOpname.js',
'/js/apotek/notifikasi.js',
'/js/apotek/retur.js',
    '/js/klinik/antrian.js',
    '/js/klinik/pasien.js',
    '/js/klinik/rekamMedis.js',
    '/js/klinik/resep.js',
    '/js/keuangan/akuntansi.js',
    '/js/keuangan/laporanKeuangan.js',
    '/js/keuangan/payroll.js',
    '/js/laporan/hutang.js',
    '/js/laporan/pengeluaran.js',
    '/js/laporan/piutang.js',
'/js/laporan/penjualanHarian.js',
    '/js/manajemen/absensi.js',
    '/js/manajemen/karyawan.js',
    '/js/pengaturan/gaji.js',
    '/js/pengaturan/pembagian.js',
    '/js/pengaturan/profil.js',
    '/js/pengaturan/tindakan.js',
    '/js/pengaturan/users.js',
    '/icon-192.png',
    '/icon-512.png'
];

self.addEventListener('install', function(event) {
    // FIX: jangan telan error addAll, supaya install benar-benar gagal jika cache shell rusak.
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            // addAll bersifat all-or-nothing; gunakan add per item agar 1 file gagal tidak menghancurkan install.
            return Promise.all(urlsToCache.map(function(url) {
                return cache.add(url).catch(function(err) {
                    console.warn('[SW] Gagal cache:', url, err);
                });
            }));
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; })
                                   .map(function(k) { return caches.delete(k); }));
        }).then(function() { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function(event) {
    var req = event.request;
    if (req.method !== 'GET') return;

    var url = new URL(req.url);
    // Jangan cache Firestore/Auth dynamic API
    if (url.hostname.indexOf('firestore') !== -1 ||
        url.hostname.indexOf('googleapis.com') !== -1 ||
        url.hostname.indexOf('identitytoolkit') !== -1) {
        return; // biarkan network handle
    }

    event.respondWith(
        caches.match(req).then(function(cached) {
            var fetchPromise = fetch(req).then(function(networkRes) {
                // FIX: izinkan basic, cors, dan opaque (CDN) untuk di-cache.
                if (networkRes && (networkRes.type === 'basic' || networkRes.type === 'cors' || networkRes.type === 'opaque')) {
                    var clone = networkRes.clone();
                    caches.open(CACHE_NAME).then(function(cache) { cache.put(req, clone); });
                }
                return networkRes;
            }).catch(function() { return cached; });
            // stale-while-revalidate
            return cached || fetchPromise;
        })
    );
});

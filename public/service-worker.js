// public/service-worker.js
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('v1').then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                '/icon.png',
                '/icon-512.png'
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Handle NFC-specific events
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NFC_DETECTED') {
        // Handle NFC detection in background
        clients.matchAll().then((clients) => {
            clients.forEach((client) => {
                client.postMessage({
                    type: 'NFC_UPDATE',
                    payload: event.data.payload
                });
            });
        });
    }
});
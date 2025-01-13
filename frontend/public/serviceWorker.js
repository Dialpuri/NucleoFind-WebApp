const CACHE_NAME = 'nucleofind-nano-24-12-31-float32';
const ONNX_FILE_URL = '/nucleofind-nano-float32.onnx';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.add(ONNX_FILE_URL);
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.endsWith('.onnx')) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            )
        )
    );
});

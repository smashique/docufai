self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (e) => {
  // Offline support basic logic
  e.respondWith(fetch(e.request));
});

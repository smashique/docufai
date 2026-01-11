// sw.js
const CACHE_NAME = 'docufai-pro-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// ১. ইনস্টল ইভেন্ট: সব দরকারি ফাইল ক্যাশ করা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// ২. ফেচ ইভেন্ট: অফলাইনে থাকলে ক্যাশ থেকে ফাইল দেখানো
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // যদি ক্যাশে ফাইল থাকে তবে সেটি দাও, নাহলে নেটওয়ার্ক থেকে নাও
      return response || fetch(event.request);
    }).catch(() => {
      // যদি ইন্টারনেট না থাকে এবং ক্যাশেও ফাইল না থাকে
      return caches.match('/index.html');
    })
  );
});

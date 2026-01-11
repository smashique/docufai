// sw.js - Docufai Pro Service Worker
const CACHE_NAME = 'docufai-v2-perfect';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// ১. ইনস্টল ইভেন্ট: সব দরকারি ফাইল ক্যাশ (Cache) করা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Docufai SW: Caching Assets...');
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
      // যদি ইন্টারনেট না থাকে তবে ডিফল্ট হিসেবে index.html দেখাও
      return caches.match('/index.html');
    })
  );
});

// ৩. অ্যাক্টিভেট ইভেন্ট: পুরাতন ক্যাশ পরিষ্কার করা
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Docufai SW: Clearing Old Cache...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

const CACHE_NAME = 'superpassword-cache-v1';
const urlsToCache = [
  '/',
  '/controle.html',
  '/css/styles.css',
  '/js/app-controle.js',
  '/manifest.json'
];

// Instala o Service Worker e faz o cache dos arquivos básicos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Intercepta requisições (se estiver offline, tenta buscar do cache)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
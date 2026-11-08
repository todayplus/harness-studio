/* Harness Studio service worker — offline shell */
const VERSION = 'hs-__VERSION__';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/favicon.svg',
  './audio/manifest.json',
  './audio/c01.mp3','./audio/c02.mp3','./audio/c03.mp3','./audio/c04.mp3','./audio/c05.mp3',
  './audio/c06.mp3','./audio/c07.mp3','./audio/c08.mp3','./audio/c09.mp3','./audio/c10.mp3',
  './audio/c11.mp3','./audio/c12.mp3','./audio/c13.mp3','./audio/c14.mp3','./audio/c15.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // navigation: cache-first shell, fall back to network then offline shell
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // same-origin assets: cache-first with background refresh
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const network = fetch(req).then(res => {
          if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => hit);
        return hit || network;
      })
    );
    return;
  }

  // cross-origin (fonts): stale-while-revalidate
  e.respondWith(
    caches.match(req).then(hit => {
      const network = fetch(req).then(res => {
        if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || network;
    })
  );
});

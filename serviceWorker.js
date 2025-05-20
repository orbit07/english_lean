// ① キャッシュ名を定義（バージョンを上げるときはここを書き換える）
const CACHE_NAME = 'phrase-app-v2.8';

// ② キャッシュ対象のリストを配列にまとめておくと管理しやすい
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './serviceWorker.js',
  './assets/css/style.css',
  './assets/js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())  // 新しい SW をすぐに有効化
  );
});

// ③ 古いキャッシュを削除する activate イベントを追加
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

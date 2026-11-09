// Keep the installable shell available without caching Scripture, notes or API responses.
const offlineCache = 'spiritbible-install-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(offlineCache).then(cache => cache.add('/offline.html')).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('spiritbible-install-') && key !== offlineCache).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(async () => {
    const cache = await caches.open(offlineCache);
    return await cache.match('/offline.html') || new Response('SpiritBible is offline. Please reconnect and reload.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});

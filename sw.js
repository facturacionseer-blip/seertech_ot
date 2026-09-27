// Service worker: la app funciona sin señal. Primero intenta la red (para recibir actualizaciones) y si no hay, usa la copia guardada.
const CACHE = 'seertech-ot-v1';
const ARCHIVOS = ['./', 'index.html', 'app.js', 'app.css', 'config.js', 'manifest.json', 'logo.jpg', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    Promise.race([fetch(e.request), new Promise((_, no) => setTimeout(() => no(new Error('lenta')), 5000))]).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

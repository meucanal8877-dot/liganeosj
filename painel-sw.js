// Service worker do Painel Liga Neo SJ: abre mesmo sem internet (os dados ficam salvos no aparelho).
const CACHE = 'painel-neo-v2';
const BASE = ['/painel/', '/painel/manifest.webmanifest', '/painel/icon-192.png', '/painel/icon-512.png', '/logo-liga.png', '/escudo-al-ec.png', '/escudo-al-fc.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate' || url.pathname === '/painel' || url.pathname === '/painel/' || url.pathname === '/painel/index.html') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put('/painel/', c)); return r; }).catch(() => caches.match('/painel/')));
    return;
  }
  if (/\.(png|jpe?g|webp|svg)$/i.test(url.pathname)) {
    // Mostra a foto salva na hora e busca a versão nova em segundo plano (fotos atualizadas aparecem no próximo acesso).
    e.respondWith(caches.open(CACHE).then(k => k.match(req).then(h => { const f = fetch(req).then(r => { if (r.ok) k.put(req, r.clone()); return r; }).catch(() => h); return h || f; })));
  }
});

/* Cache versionado: altere a versão ao publicar uma nova atualização do app. */
const CACHE_PREFIX = 'brownies-app-';
const CACHE_NAME = `${CACHE_PREFIX}v9`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Um ícone ausente não deve impedir a instalação do restante do app.
    await Promise.allSettled(APP_SHELL.map((asset) => cache.add(asset)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes
      .filter((nome) => (nome.startsWith(CACHE_PREFIX) || nome === 'brownies-v8-cache-1') && nome !== CACHE_NAME)
      .map((nome) => caches.delete(nome)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Não intercepta Firebase nem outros serviços externos.
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const resposta = await fetch(request);
      if (resposta && resposta.ok && resposta.type === 'basic') {
        const chave = request.mode === 'navigate' ? './index.html' : request;
        await cache.put(chave, resposta.clone());
      }
      return resposta;
    } catch (_) {
      const emCache = await cache.match(request);
      if (emCache) return emCache;
      if (request.mode === 'navigate') {
        return (await cache.match('./index.html')) || Response.error();
      }
      return Response.error();
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Service worker do Multiverso Girls.
//
// SEGURANÇA/PRIVACIDADE: nada que dependa de sessão pode ir para o cache do
// navegador (páginas logadas, chats, dados de perfil, exportação LGPD, respostas
// da API do Supabase). Só ativos estáticos versionados são guardados; páginas
// nunca — offline mostramos apenas a página inicial pública.
const CACHE_NAME = "multiverso-girls-static-v2";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // outras origens (Supabase, imagens do Storage, wa.me...) passam direto, sem cache
  if (url.origin !== self.location.origin) return;
  // rotas dinâmicas/sensíveis: sempre rede
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/go/")) return;

  // navegação: rede; se falhar, página inicial pública em cache (nunca cacheia HTML de sessão)
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // ativos estáticos versionados: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});

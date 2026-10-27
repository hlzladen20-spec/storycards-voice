const CACHE = "storycards-shell-card-choice-v8";
const SHELL = ["/", "/index.html", "/styles.css", "/cards-design.css", "/cards-design.js", "/card-manager.css", "/card-manager.js", "/learning-storage.js", "/account-data.js", "/cloud-account.js", "/cloud-account.css", "/vendor/supabase.js", "/app.js", "/cards.js", "/fsrs.mjs", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !SHELL.includes(url.pathname)) return;
  event.respondWith(fetch(event.request).then((response) => {
    caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request)));
});

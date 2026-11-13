const CACHE = "storycards-shell-lesson-return-cards-v45";
const SHELL = ["/language-courses.js", "/language-ui.js", "/language-courses.css", "/", "/index.html", "/styles.css", "/cards-design.css", "/cards-design.js", "/card-manager.css", "/card-manager.js", "/learning-storage.js", "/account-data.js", "/cloud-account.js", "/cloud-account.css", "/vendor/supabase.js", "/app.js", "/cards.js", "/fsrs.mjs", "/manifest.webmanifest", "/icon.svg"];

SHELL.push("/keep-awake.js", "/speaking-goal.js", "/learning-streak.js", "/lesson-planner.js", "/learning-images.js", "/learning-images/workshop-v1.png", "/learning-images/restaurant-v1.png", "/learning-images/travel-v1.png", "/learning-images/shopping-v1.png");
SHELL.push("/vocabulary.js", "/vocabulary-trainer.js", "/vocabulary.css", "/word-translation.js", "/conversation-modes.js", "/home.css");
SHELL.push('/conversation-summary.js','/learning-strategy.js','/card-vocabulary.js','/learning-summary.css');
SHELL.push('/learning-tips.js');
SHELL.push('/proficiency.js','/proficiency-ui.js','/proficiency-goals.js','/proficiency.css');
SHELL.push('/conversation-bookends.js');
SHELL.push('/developer-tools.js');
SHELL.push('/english-check.js');
SHELL.push('/profile-layout.js','/profile-layout.css');
SHELL.push('/statistics-layout.css');
SHELL.push('/app-dialog.js','/app-dialog.css');
SHELL.push('/conversation-topic-picker.js');
SHELL.push('/emma-voices.js','/check-completion.js');
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

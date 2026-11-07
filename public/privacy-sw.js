const CACHE_NAME = "rechner-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const rootUrl = new URL(self.registration.scope);
    try {
      const response = await fetch(rootUrl, { cache: "reload" });
      if (response.ok) {
        await cache.put(rootUrl, response);
      }
    }
    catch {
      // Installation can finish without a network; visited pages are cached on use.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("rechner-offline-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: false });
    if (cached) {
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    }
    catch {
      if (request.mode === "navigate") {
        const root = await cache.match(self.registration.scope);
        if (root) {
          return root;
        }
      }
      return new Response("This page has not been cached yet. Connect once to prepare it for offline use.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  })());
});

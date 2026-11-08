const CACHE_NAME = "rechner-offline-v2";

async function cachePageAndAssets(pageUrl, cache, visited) {
  const url = new URL(pageUrl);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname) || visited.has(url.href)) {
    return true;
  }
  visited.add(url.href);

  let response;
  try {
    response = await fetch(url, { cache: "reload" });
  }
  catch {
    return false;
  }
  if (!response.ok || response.type !== "basic") {
    return false;
  }
  try {
    await cache.put(url, response.clone());
  }
  catch {
    return false;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  const body = await response.clone().text();
  const references = contentType.includes("text/html")
    ? [...body.matchAll(/(?:src|href|component-url|renderer-url|before-hydration-url)="([^"]+)"/g)].map((match) => match[1])
    : contentType.includes("text/css")
      ? [...body.matchAll(/url\(["']?([^\)"']+)["']?\)/g)].map((match) => match[1])
      : [];
  const sameScope = references.map((reference) => new URL(reference, url))
    .filter((reference) => reference.origin === scope.origin && reference.pathname.startsWith(scope.pathname))
    .map((reference) => {
      reference.hash = "";
      return reference;
    });
  const results = await Promise.all(sameScope.map((reference) => cachePageAndAssets(reference, cache, visited)));
  return results.every(Boolean);
}

async function prepareOfflineCache() {
  const cache = await caches.open(CACHE_NAME);
  const scope = new URL(self.registration.scope);
  const routes = [
    "",
    "calculators/net-pay/",
    "calculators/parental-leave/",
  ].map((route) => new URL(route, scope));
  const results = await Promise.all(routes.map((route) => cachePageAndAssets(route, cache, new Set())));
  return results.every(Boolean);
}

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

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_RECHNER_OFFLINE") {
    return;
  }
  event.waitUntil((async () => {
    const ok = await prepareOfflineCache();
    event.ports[0]?.postMessage({ ok });
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
    try {
      const response = await fetch(request, { cache: "no-cache" });
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    }
    catch {
      const cached = await cache.match(request, { ignoreSearch: false });
      if (cached) {
        return cached;
      }
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

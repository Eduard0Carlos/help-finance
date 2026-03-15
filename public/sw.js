const SW_VERSION = "hf-v3";
const STATIC_CACHE = `${SW_VERSION}-static`;
const API_CACHE = `${SW_VERSION}-api`;

const STATIC_ASSETS = ["/", "/favicon.ico", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
const API_READ_PATHS = ["/api/transactions", "/api/investments", "/api/user"];
const TRANSACTIONS_CACHE_PATHS = ["/api/transactions", "/api/recurring-transactions"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isApiReadRequest(requestUrl, requestMethod) {
  return (
    requestMethod === "GET" &&
    API_READ_PATHS.some((path) => requestUrl.pathname.startsWith(path))
  );
}

function shouldInvalidateTransactionsCache(requestUrl, requestMethod) {
  if (requestMethod === "GET" || requestMethod === "HEAD") return false;
  return TRANSACTIONS_CACHE_PATHS.some((path) => requestUrl.pathname.startsWith(path));
}

async function invalidateTransactionsCache() {
  const cache = await caches.open(API_CACHE);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((req) => {
        const reqUrl = new URL(req.url);
        return TRANSACTIONS_CACHE_PATHS.some((path) => reqUrl.pathname.startsWith(path));
      })
      .map((req) => cache.delete(req))
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (shouldInvalidateTransactionsCache(url, request.method)) {
    event.waitUntil(invalidateTransactionsCache());
  }

  if (isApiReadRequest(url, request.method)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          throw new Error("Network unavailable and no cached API response.");
        }
      })
    );
    return;
  }

  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const shouldCache =
            response &&
            response.ok &&
            (request.destination === "script" ||
              request.destination === "style" ||
              request.destination === "font" ||
              request.destination === "image");
          if (shouldCache) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match("/"));
    })
  );
});

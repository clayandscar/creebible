const CACHE_NAME = "little-bear-full-bible-github-pages-v1";
const scopeRoot = self.registration.scope;
const resolveFromScope = (path) => new URL(path, scopeRoot).toString();
const APP_ASSETS = [
  "",
  "manifest.webmanifest",
  "bible/index.json",
  "assets/peace-trail.png",
  "assets/guidance-trail.png",
  "assets/courage-trail.png",
  "assets/love-trail.png",
  "assets/faith-trail.png",
  "assets/little-bear.png",
  "assets/balsamiq-regular.woff2",
  "assets/balsamiq-bold.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
].map(resolveFromScope);

async function precacheApp() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_ASSETS);
  const homeUrl = resolveFromScope("");
  const home = await fetch(homeUrl);
  await cache.put(homeUrl, home.clone());
  const html = await home.text();
  const discovered = [];
  const assetPattern = /(?:src|href)=["']([^"']+)["']/g;
  let match;
  while ((match = assetPattern.exec(html))) {
    const asset = new URL(match[1], homeUrl);
    if (asset.origin === self.location.origin && discovered.indexOf(asset.href) === -1) discovered.push(asset.href);
  }
  await Promise.all(discovered.map((asset) => fetch(asset).then((response) => cache.put(asset, response)).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApp());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.url.indexOf("/bible/") !== -1 || event.request.url.indexOf("/assets/") !== -1 || event.request.url.indexOf("/icons/") !== -1) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
        return response;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match(resolveFromScope(""))))
  );
});

/* BITIKLAR service worker — oflayn rejim.
 * - Sahifalar va API: avval tarmoq, internet bo'lmasa — saqlangan nusxa.
 * - /_next/static (o'zgarmas fayllar): avval kesh.
 * - Xarita plitkalari va rasmlar: avval kesh (cheklangan hajmda).
 */
const VERSION = "v2";
const PAGES = `bitiklar-pages-${VERSION}`;
const STATIC = `bitiklar-static-${VERSION}`;
const TILES = `bitiklar-tiles-${VERSION}`;
const IMAGES = `bitiklar-img-${VERSION}`;
const LIMITS = { [TILES]: 1500, [IMAGES]: 400, [PAGES]: 300 };
const TILE_HOSTS = ["server.arcgisonline.com", "tile.openstreetmap.org", "basemaps.cartocdn.com"];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keep = new Set([PAGES, STATIC, TILES, IMAGES]);
    for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trim(name) {
  const c = await caches.open(name);
  const keys = await c.keys();
  const max = LIMITS[name] || 500;
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

async function networkFirst(req, cacheName) {
  const c = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok && res.type !== "opaqueredirect") { c.put(req, res.clone()); trim(cacheName); }
    return res;
  } catch (err) {
    const hit = await c.match(req, { ignoreVary: true, ignoreSearch: false });
    if (hit) return hit;
    if (req.mode === "navigate") {
      const lang = (new URL(req.url).pathname.split("/")[1] || "uz").slice(0, 2);
      const home = await c.match(`/${lang}`, { ignoreVary: true });
      if (home) return home;
      return new Response(
        `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>BITIKLAR</title>
         <body style="font-family:system-ui;padding:40px;text-align:center;background:#0d1834;color:#f1e3c6">
         <h1>Internet yo'q</h1><p>Bu sahifa oldindan saqlanmagan. Internet qaytgach qayta urinib ko'ring.</p></body>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") { c.put(req, res.clone()); trim(cacheName); }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (TILE_HOSTS.some((h) => url.hostname.endsWith(h))) { e.respondWith(cacheFirst(req, TILES)); return; }
  if (url.origin !== self.location.origin) {
    if (req.destination === "image") e.respondWith(cacheFirst(req, IMAGES));
    return;
  }
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/api/ai")
      || url.pathname.startsWith("/api/editor")) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/static/")) { e.respondWith(cacheFirst(req, STATIC)); return; }
  if (url.pathname.startsWith("/media/") || req.destination === "image") { e.respondWith(cacheFirst(req, IMAGES)); return; }
  if (req.mode === "navigate" || url.pathname.startsWith("/api/") || req.headers.get("RSC")) {
    e.respondWith(networkFirst(req, PAGES));
  }
});

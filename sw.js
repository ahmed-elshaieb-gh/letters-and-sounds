/* Letters and Sounds Club - offline cache */
const CACHE = "lsc-75f2fa62";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* The page itself is NETWORK FIRST, so an update always wins when there is a
   connection, and the cached copy is only used when there is none. Getting this
   wrong once meant a new version sat on GitHub while the tablet kept showing the
   old one. Everything else (icons, manifest, Google Fonts) is cache first,
   because those do not change and should survive going offline. */
function isPage(req) {
  return req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") !== -1;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (isPage(req)) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => { try { c.put("./index.html", copy); } catch (err) {} });
        return res;
      }).catch(() =>
        caches.match("./index.html").then((hit) => hit || caches.match("./"))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch (err) {} });
        return res;
      }).catch(() => hit);
    })
  );
});

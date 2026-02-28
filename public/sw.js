const CACHE_NAME = 'onnx-models-v1';
const MAX_CACHE_ENTRIES = 20;

const ALLOWED_HOSTS = ['cdn.jsdelivr.net', 'unpkg.com'];

function isModelAsset(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.includes(parsed.hostname) && (parsed.pathname.includes('onnx') || parsed.pathname.includes('@imgly'));
  } catch {
    return false;
  }
}

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_CACHE_ENTRIES) {
    await cache.delete(keys[0]);
  }
}

self.addEventListener('fetch', (event) => {
  if (!isModelAsset(event.request.url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone());
            trimCache(cache);
          }
          return response;
        });
      })
    )
  );
});

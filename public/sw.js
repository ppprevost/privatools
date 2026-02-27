const CACHE_NAME = 'onnx-models-v1';

function isModelAsset(url) {
  return url.includes('onnx') || url.includes('@imgly');
}

self.addEventListener('fetch', (event) => {
  if (!isModelAsset(event.request.url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        });
      })
    )
  );
});

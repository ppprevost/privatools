import { compressImage } from '../image/compress';

self.onmessage = async (e: MessageEvent) => {
  try {
    const { data, options, filename } = e.data;
    const quality = options?.quality ?? 0.8;
    const type = options?.type ?? 'image/jpeg';

    const blob = await compressImage(data, type, quality, (progress) => {
      self.postMessage({ type: 'progress', progress });
    });

    const buffer = await blob.arrayBuffer();
    const ext = type === 'image/png' ? 'png' : 'jpg';
    const outName = (filename ?? `image.${ext}`).replace(/\.[^.]+$/, `_compressed.${ext}`);

    self.postMessage(
      { type: 'result', result: buffer, filename: outName },
      [buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', error: (err as Error).message });
  }
};

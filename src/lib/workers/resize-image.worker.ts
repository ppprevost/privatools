import { resizeImage } from '../image/resize';

self.onmessage = async (e: MessageEvent) => {
  try {
    const { data, options, filename } = e.data;
    const type = options?.type ?? 'image/jpeg';

    const blob = await resizeImage(data, type, {
      width: options?.width ?? 800,
      height: options?.height ?? 600,
      maintainAspectRatio: options?.maintainAspectRatio ?? true,
    }, (progress) => {
      self.postMessage({ type: 'progress', progress });
    });

    const buffer = await blob.arrayBuffer();
    const ext = type === 'image/png' ? 'png' : 'jpg';
    const outName = (filename ?? `image.${ext}`).replace(/\.[^.]+$/, `_resized.${ext}`);

    self.postMessage(
      { type: 'result', result: buffer, filename: outName },
      [buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', error: (err as Error).message });
  }
};

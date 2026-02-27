import { cropImage } from '../image/crop';

self.onmessage = async (e: MessageEvent) => {
  try {
    const { data, options, filename } = e.data;
    const type = options?.type ?? 'image/jpeg';

    const blob = await cropImage(data, type, {
      x: options?.x ?? 0,
      y: options?.y ?? 0,
      width: options?.width ?? 100,
      height: options?.height ?? 100,
    }, (progress) => {
      self.postMessage({ type: 'progress', progress });
    });

    const buffer = await blob.arrayBuffer();
    const ext = type === 'image/png' ? 'png' : 'jpg';
    const outName = (filename ?? `image.${ext}`).replace(/\.[^.]+$/, `_cropped.${ext}`);

    self.postMessage(
      { type: 'result', result: buffer, filename: outName },
      [buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', error: (err as Error).message });
  }
};

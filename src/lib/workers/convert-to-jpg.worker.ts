import { convertToJpg } from '../image/convert';

self.onmessage = async (e: MessageEvent) => {
  try {
    const { data, options, filename } = e.data;
    const type = options?.type ?? 'image/png';
    const quality = options?.quality ?? 0.92;

    const blob = await convertToJpg(data, type, quality, (progress) => {
      self.postMessage({ type: 'progress', progress });
    });

    const buffer = await blob.arrayBuffer();
    const outName = (filename ?? 'image.png').replace(/\.[^.]+$/, '.jpg');

    self.postMessage(
      { type: 'result', result: buffer, filename: outName },
      [buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', error: (err as Error).message });
  }
};

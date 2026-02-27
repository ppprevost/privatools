import { compressPdf } from '../pdf/compress';

self.onmessage = async (e: MessageEvent) => {
  try {
    const { data, options } = e.data;
    const result = await compressPdf(data, {
      stripMetadata: options?.stripMetadata ?? true,
    }, (progress) => {
      self.postMessage({ type: 'progress', progress });
    });
    self.postMessage(
      { type: 'result', result: result.buffer, filename: (e.data.filename ?? 'compressed.pdf').replace(/\.pdf$/i, '_compressed.pdf') },
      [result.buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', error: (err as Error).message });
  }
};

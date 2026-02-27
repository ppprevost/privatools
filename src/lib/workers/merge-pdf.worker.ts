import { mergePdfs } from '../pdf/merge';

self.onmessage = async (e: MessageEvent) => {
  try {
    const { options } = e.data;
    const buffers: ArrayBuffer[] = options.files;
    const result = await mergePdfs(buffers, (progress) => {
      self.postMessage({ type: 'progress', progress });
    });
    self.postMessage(
      { type: 'result', result: result.buffer, filename: 'merged.pdf' },
      [result.buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', error: (err as Error).message });
  }
};

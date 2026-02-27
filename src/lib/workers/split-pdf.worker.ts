import { splitPdf } from '../pdf/split';

self.onmessage = async (e: MessageEvent) => {
  try {
    const { data, options, filename } = e.data;
    const results = await splitPdf(data, options?.pageRanges ?? '', filename ?? 'document.pdf', (progress) => {
      self.postMessage({ type: 'progress', progress });
    });

    const serialized = results.map((r) => ({
      filename: r.filename,
      data: r.data.buffer,
    }));

    self.postMessage(
      { type: 'result', result: serialized, filename: 'split' },
      serialized.map((r) => r.data)
    );
  } catch (err) {
    self.postMessage({ type: 'error', error: (err as Error).message });
  }
};

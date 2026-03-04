import { signPdf, type SignaturePlacement } from '../pdf/sign';

self.onmessage = async (e: MessageEvent) => {
  try {
    const { data, options, filename } = e.data;
    const placements: SignaturePlacement[] = options.placements;
    const result = await signPdf(data, placements, (progress) => {
      self.postMessage({ type: 'progress', progress });
    });
    self.postMessage(
      { type: 'result', result: result.buffer, filename: (filename ?? 'signed.pdf').replace(/\.pdf$/i, '_signed.pdf') },
      [result.buffer],
    );
  } catch (err) {
    self.postMessage({ type: 'error', error: (err as Error).message });
  }
};

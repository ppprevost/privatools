import { jpgToPdf } from '../pdf/jpg-to-pdf';

self.onmessage = async (e: MessageEvent) => {
  try {
    const { options } = e.data;
    const files: ArrayBuffer[] = options.files;
    const names: string[] = options.names;

    const images = files.map((data, i) => {
      const name = names[i] ?? `image_${i}`;
      const ext = name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const type = ext === 'png' ? 'image/png' : 'image/jpeg';
      return { data, name, type };
    });

    const result = await jpgToPdf(images, (progress) => {
      self.postMessage({ type: 'progress', progress });
    });

    self.postMessage(
      { type: 'result', result: result.buffer, filename: 'images.pdf' },
      [result.buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', error: (err as Error).message });
  }
};

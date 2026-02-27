import { PDFDocument } from 'pdf-lib';

export interface CompressOptions {
  stripMetadata: boolean;
}

export async function compressPdf(
  data: ArrayBuffer,
  options: CompressOptions = { stripMetadata: true },
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  onProgress?.(10);

  const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
  onProgress?.(30);

  if (options.stripMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
  }
  onProgress?.(50);

  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { MediaBox } = page.node.normalizedEntries();
    if (MediaBox) {
      page.node.set(page.node.context.obj('MediaBox'), MediaBox);
    }
    onProgress?.(50 + (i / pages.length) * 30);
  }

  onProgress?.(80);
  const result = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });
  onProgress?.(100);

  return result;
}

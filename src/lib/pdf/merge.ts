import { PDFDocument } from 'pdf-lib';

export async function mergePdfs(
  buffers: ArrayBuffer[],
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  onProgress?.(5);
  const merged = await PDFDocument.create();

  for (let i = 0; i < buffers.length; i++) {
    const doc = await PDFDocument.load(buffers[i], { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
    onProgress?.(10 + (i / buffers.length) * 80);
  }

  onProgress?.(90);
  const result = await merged.save();
  onProgress?.(100);
  return result;
}

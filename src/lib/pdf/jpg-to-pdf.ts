import { PDFDocument } from 'pdf-lib';

export async function jpgToPdf(
  images: { data: ArrayBuffer; name: string; type: string }[],
  onProgress?: (p: number) => void
): Promise<Uint8Array> {
  onProgress?.(5);
  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    let embedded;

    if (img.type === 'image/png') {
      embedded = await pdfDoc.embedPng(img.data);
    } else {
      embedded = await pdfDoc.embedJpg(img.data);
    }

    const page = pdfDoc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    });

    onProgress?.(10 + (i / images.length) * 80);
  }

  onProgress?.(90);
  const result = await pdfDoc.save();
  onProgress?.(100);
  return result;
}

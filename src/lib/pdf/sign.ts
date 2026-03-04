import { PDFDocument } from 'pdf-lib';

export type Placement = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
};

export type SignaturePlacement = {
  pageIndex: number;
  xPdf: number;
  yPdf: number;
  widthPdf: number;
  heightPdf: number;
  imageBytes: Uint8Array;
};

export const toPdfCoords = (
  displayX: number,
  displayY: number,
  displayW: number,
  displayH: number,
  canvasWidth: number,
  canvasHeight: number,
  pageWidth: number,
  pageHeight: number,
) => ({
  xPdf: displayX * (pageWidth / canvasWidth),
  yPdf: pageHeight - (displayY + displayH) * (pageHeight / canvasHeight),
  widthPdf: displayW * (pageWidth / canvasWidth),
  heightPdf: displayH * (pageHeight / canvasHeight),
});

export async function signPdf(
  pdfData: ArrayBuffer,
  placements: SignaturePlacement[],
  onProgress?: (p: number) => void,
): Promise<Uint8Array> {
  onProgress?.(5);
  const pdfDoc = await PDFDocument.load(pdfData);
  onProgress?.(20);

  const pages = pdfDoc.getPages();

  for (const [i, p] of placements.entries()) {
    const page = pages[p.pageIndex];
    if (!page) continue;

    const pngImage = await pdfDoc.embedPng(p.imageBytes);
    page.drawImage(pngImage, {
      x: p.xPdf,
      y: p.yPdf,
      width: p.widthPdf,
      height: p.heightPdf,
    });

    onProgress?.(20 + ((i + 1) / placements.length) * 60);
  }

  onProgress?.(85);
  const result = await pdfDoc.save();
  onProgress?.(100);
  return result;
}

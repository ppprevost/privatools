import { describe, it, expect, vi } from 'vitest';
import { toPdfCoords, signPdf } from './sign';
import { PDFDocument } from 'pdf-lib';

describe('toPdfCoords', () => {
  it('converts top-left origin to bottom-left origin', () => {
    const result = toPdfCoords(0, 0, 100, 50, 612, 792, 612, 792);
    expect(result.xPdf).toBe(0);
    expect(result.yPdf).toBe(792 - 50);
    expect(result.widthPdf).toBe(100);
    expect(result.heightPdf).toBe(50);
  });

  it('places at bottom-right of page', () => {
    const result = toPdfCoords(512, 742, 100, 50, 612, 792, 612, 792);
    expect(result.xPdf).toBe(512);
    expect(result.yPdf).toBe(0);
    expect(result.widthPdf).toBe(100);
    expect(result.heightPdf).toBe(50);
  });

  it('scales when canvas and page differ in size', () => {
    const result = toPdfCoords(100, 100, 200, 100, 600, 800, 300, 400);
    expect(result.xPdf).toBeCloseTo(50);
    expect(result.widthPdf).toBeCloseTo(100);
    expect(result.heightPdf).toBeCloseTo(50);
    expect(result.yPdf).toBeCloseTo(400 - (100 + 100) * (400 / 800));
  });

  it('handles identity scale (canvas = page)', () => {
    const result = toPdfCoords(50, 50, 150, 75, 612, 792, 612, 792);
    expect(result.xPdf).toBe(50);
    expect(result.yPdf).toBe(792 - (50 + 75));
    expect(result.widthPdf).toBe(150);
    expect(result.heightPdf).toBe(75);
  });

  it('handles landscape page proportions', () => {
    const result = toPdfCoords(0, 0, 200, 100, 800, 600, 800, 600);
    expect(result.xPdf).toBe(0);
    expect(result.yPdf).toBe(600 - 100);
    expect(result.widthPdf).toBe(200);
    expect(result.heightPdf).toBe(100);
  });

  it('returns zero-based coords for top-left placement with zero-size', () => {
    const result = toPdfCoords(0, 0, 0, 0, 612, 792, 612, 792);
    expect(result.xPdf).toBe(0);
    expect(result.yPdf).toBe(792);
    expect(result.widthPdf).toBe(0);
    expect(result.heightPdf).toBe(0);
  });

  it('centers signature on a 2x scaled canvas', () => {
    const canvasW = 1224;
    const canvasH = 1584;
    const pageW = 612;
    const pageH = 792;
    const result = toPdfCoords(512, 742, 200, 100, canvasW, canvasH, pageW, pageH);
    expect(result.xPdf).toBeCloseTo(256);
    expect(result.widthPdf).toBeCloseTo(100);
    expect(result.heightPdf).toBeCloseTo(50);
    expect(result.yPdf).toBeCloseTo(pageH - (742 + 100) * (pageH / canvasH));
  });
});

describe('signPdf', () => {
  const createTestPdf = async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    doc.addPage([612, 792]);
    return doc.save();
  };

  const create1x1Png = () => {
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    return new Uint8Array(Buffer.from(b64, 'base64'));
  };

  it('embeds a signature on page 1', async () => {
    const pdfBytes = await createTestPdf();
    const png = create1x1Png();

    const result = await signPdf(pdfBytes.buffer, [
      { pageIndex: 0, xPdf: 100, yPdf: 700, widthPdf: 150, heightPdf: 50, imageBytes: png },
    ]);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(pdfBytes.length);

    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(2);
  });

  it('embeds signatures on multiple pages', async () => {
    const pdfBytes = await createTestPdf();
    const png = create1x1Png();

    const result = await signPdf(pdfBytes.buffer, [
      { pageIndex: 0, xPdf: 100, yPdf: 700, widthPdf: 150, heightPdf: 50, imageBytes: png },
      { pageIndex: 1, xPdf: 200, yPdf: 600, widthPdf: 80, heightPdf: 40, imageBytes: png },
    ]);

    expect(result).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(2);
  });

  it('returns valid PDF with no placements', async () => {
    const pdfBytes = await createTestPdf();

    const result = await signPdf(pdfBytes.buffer, []);

    expect(result).toBeInstanceOf(Uint8Array);
    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(2);
  });

  it('reports progress', async () => {
    const pdfBytes = await createTestPdf();
    const png = create1x1Png();
    const onProgress = vi.fn();

    await signPdf(pdfBytes.buffer, [
      { pageIndex: 0, xPdf: 100, yPdf: 700, widthPdf: 150, heightPdf: 50, imageBytes: png },
    ], onProgress);

    expect(onProgress).toHaveBeenCalled();
    const calls = onProgress.mock.calls.map((c) => c[0] as number);
    expect(calls[0]).toBe(5);
    expect(calls[calls.length - 1]).toBe(100);
    const sorted = [...calls].sort((a, b) => a - b);
    expect(calls).toEqual(sorted);
  });

  it('skips invalid page index without crashing', async () => {
    const pdfBytes = await createTestPdf();
    const png = create1x1Png();

    const result = await signPdf(pdfBytes.buffer, [
      { pageIndex: 99, xPdf: 100, yPdf: 700, widthPdf: 150, heightPdf: 50, imageBytes: png },
    ]);

    expect(result).toBeInstanceOf(Uint8Array);
  });
});

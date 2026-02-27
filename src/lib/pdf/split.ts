import { PDFDocument } from 'pdf-lib';

export interface SplitResult {
  filename: string;
  data: Uint8Array;
}

export async function splitPdf(
  data: ArrayBuffer,
  pageRanges: string,
  originalFilename: string,
  onProgress?: (p: number) => void
): Promise<SplitResult[]> {
  onProgress?.(10);
  const srcDoc = await PDFDocument.load(data, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  onProgress?.(20);

  const ranges = parseRanges(pageRanges, totalPages);
  const results: SplitResult[] = [];

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    const newDoc = await PDFDocument.create();
    const pages = await newDoc.copyPages(srcDoc, range.map((p) => p - 1));
    pages.forEach((page) => newDoc.addPage(page));

    const basename = originalFilename.replace(/\.pdf$/i, '');
    const label = range.length === 1 ? `p${range[0]}` : `p${range[0]}-${range[range.length - 1]}`;

    results.push({
      filename: `${basename}_${label}.pdf`,
      data: await newDoc.save(),
    });
    onProgress?.(20 + (i / ranges.length) * 80);
  }

  onProgress?.(100);
  return results;
}

function parseRanges(input: string, max: number): number[][] {
  if (!input.trim()) {
    return Array.from({ length: max }, (_, i) => [i + 1]);
  }

  return input.split(',').map((part) => {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = Math.max(1, parseInt(startStr));
      const end = Math.min(max, parseInt(endStr));
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
    return [Math.min(max, Math.max(1, parseInt(trimmed)))];
  });
}

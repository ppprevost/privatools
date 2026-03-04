import { useState, useRef, useCallback, useEffect } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export type PageInfo = {
  widthPt: number;
  heightPt: number;
  widthPx: number;
  heightPx: number;
};

export type UsePdfRendererReturn = {
  loadPdf: (data: ArrayBuffer) => Promise<void>;
  renderPage: (canvas: HTMLCanvasElement, pageIndex: number) => Promise<PageInfo>;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
};

let pdfjsReady: Promise<typeof import('pdfjs-dist')> | null = null;

const getPdfjs = () => {
  if (!pdfjsReady) {
    pdfjsReady = import('pdfjs-dist').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      return mod;
    });
  }
  return pdfjsReady;
};

export function usePdfRenderer(): UsePdfRendererReturn {
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null);

  const loadPdf = useCallback(async (data: ArrayBuffer) => {
    setIsLoading(true);
    setError(null);
    try {
      const pdfjs = await getPdfjs();
      if (pdfDocRef.current) {
        await pdfDocRef.current.destroy();
      }
      const doc = await pdfjs.getDocument({ data }).promise;
      pdfDocRef.current = doc;
      setTotalPages(doc.numPages);
    } catch (err) {
      const msg = (err as Error).message ?? 'Failed to load PDF';
      if (msg.includes('password') || msg.includes('encrypted')) {
        setError('This PDF is password-protected. Please unlock it first.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderPage = useCallback(async (canvas: HTMLCanvasElement, pageIndex: number): Promise<PageInfo> => {
    const doc = pdfDocRef.current;
    if (!doc) throw new Error('No PDF loaded');

    const page = await doc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1.0 });

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.parentElement?.clientWidth ?? viewport.width;
    const scale = displayWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    canvas.width = scaledViewport.width * dpr;
    canvas.height = scaledViewport.height * dpr;
    canvas.style.width = `${scaledViewport.width}px`;
    canvas.style.height = `${scaledViewport.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (renderTaskRef.current?.cancel) {
      renderTaskRef.current.cancel();
    }

    const renderTask = page.render({ canvasContext: ctx, viewport: scaledViewport });
    renderTaskRef.current = renderTask;
    await renderTask.promise;

    return {
      widthPt: viewport.width,
      heightPt: viewport.height,
      widthPx: scaledViewport.width,
      heightPx: scaledViewport.height,
    };
  }, []);

  useEffect(() => {
    return () => {
      pdfDocRef.current?.destroy();
    };
  }, []);

  return { loadPdf, renderPage, totalPages, isLoading, error };
}

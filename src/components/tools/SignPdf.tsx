import { useState, useCallback, useEffect, useRef } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import { useWorker } from '@/hooks/useWorker';
import { usePdfRenderer } from '@/hooks/usePdfRenderer';
import { toPdfCoords, type SignaturePlacement } from '@/lib/pdf/sign';
import { fireConfetti } from '@/lib/confetti';
import SignatureCreator from './sign/SignatureCreator';
import PdfPageViewer from './sign/PdfPageViewer';
import PageNavigator from './sign/PageNavigator';
import type { Placement } from './sign/PlacementOverlay';
import { PenLine, Stamp, ArrowLeft } from 'lucide-react';

type Phase = 'upload' | 'create-signature' | 'create-initials' | 'place';

const SIGNATURE_DISPLAY_W = 150;
const SIGNATURE_DISPLAY_H = 50;
const INITIALS_DISPLAY_W = 80;
const INITIALS_DISPLAY_H = 40;

export default function SignPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('upload');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [initialsDataUrl, setInitialsDataUrl] = useState<string | null>(null);
  const [activeGhost, setActiveGhost] = useState<'signature' | 'initials' | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const pdfDataRef = useRef<ArrayBuffer | null>(null);
  const pageInfoRef = useRef<Map<number, { widthPt: number; heightPt: number }>>(new Map());

  const pdf = usePdfRenderer();

  const { process: workerProcess, reset: workerReset, ...workerState } = useWorker({
    createWorker: () =>
      new Worker(new URL('../../lib/workers/sign-pdf.worker.ts', import.meta.url), { type: 'module' }),
  });

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    workerReset();
    setPlacements([]);
    setSignatureDataUrl(null);
    setInitialsDataUrl(null);
    setActiveGhost(null);
    setCurrentPage(0);

    const buffer = await f.arrayBuffer();
    pdfDataRef.current = buffer;
    await pdf.loadPdf(buffer);

    if (!pdf.error) {
      setPhase('create-signature');
    }
  }, [pdf, workerReset]);

  const handleSignatureConfirm = useCallback((dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    setActiveGhost('signature');
    setPhase('place');
  }, []);

  const handleInitialsConfirm = useCallback((dataUrl: string) => {
    setInitialsDataUrl(dataUrl);
    setActiveGhost('initials');
    setPhase('place');
  }, []);

  const handlePlaceSignature = useCallback((pageIndex: number, x: number, y: number, containerW: number, containerH: number) => {
    const ghost = activeGhost;
    const dataUrl = ghost === 'initials' ? initialsDataUrl : signatureDataUrl;
    if (!dataUrl) return;

    const isInitials = ghost === 'initials';
    const w = isInitials ? INITIALS_DISPLAY_W : SIGNATURE_DISPLAY_W;
    const h = isInitials ? INITIALS_DISPLAY_H : SIGNATURE_DISPLAY_H;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPlacements((prev) => [
      ...prev,
      {
        id,
        pageIndex,
        x: x - w / 2,
        y: y - h / 2,
        width: w,
        height: h,
        dataUrl,
      },
    ]);

    setActiveGhost(null);
  }, [activeGhost, signatureDataUrl, initialsDataUrl]);

  const handleUpdatePlacement = useCallback((id: string, updates: Partial<Pick<Placement, 'x' | 'y' | 'width' | 'height'>>) => {
    setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const handleRemovePlacement = useCallback((id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const storePageInfo = useCallback((pageIndex: number, widthPt: number, heightPt: number) => {
    pageInfoRef.current.set(pageIndex, { widthPt, heightPt });
  }, []);

  const renderPageWithInfo = useCallback(async (canvas: HTMLCanvasElement, pageIndex: number) => {
    const info = await pdf.renderPage(canvas, pageIndex);
    storePageInfo(pageIndex, info.widthPt, info.heightPt);
    return info;
  }, [pdf, storePageInfo]);

  const handleSign = useCallback(async () => {
    if (!pdfDataRef.current || placements.length === 0) return;

    const pdfPlacements: SignaturePlacement[] = await Promise.all(
      placements.map(async (p) => {
        const pageInfo = pageInfoRef.current.get(p.pageIndex) ?? { widthPt: 612, heightPt: 792 };
        const canvas = document.querySelector(`canvas`) as HTMLCanvasElement | null;
        const canvasW = canvas ? parseFloat(canvas.style.width) : pageInfo.widthPt;
        const canvasH = canvas ? parseFloat(canvas.style.height) : pageInfo.heightPt;

        const coords = toPdfCoords(
          p.x, p.y, p.width, p.height,
          canvasW, canvasH,
          pageInfo.widthPt, pageInfo.heightPt,
        );

        const res = await fetch(p.dataUrl);
        const buf = await res.arrayBuffer();

        return {
          pageIndex: p.pageIndex,
          xPdf: coords.xPdf,
          yPdf: coords.yPdf,
          widthPdf: coords.widthPdf,
          heightPdf: coords.heightPdf,
          imageBytes: new Uint8Array(buf),
        };
      })
    );

    const buffer = pdfDataRef.current.slice(0);
    workerProcess(buffer, { placements: pdfPlacements }, file?.name);
  }, [placements, file, workerProcess]);

  useEffect(() => {
    if (workerState.result) fireConfetti();
  }, [workerState.result]);

  const resultBlob = workerState.result ? new Blob([workerState.result.data], { type: 'application/pdf' }) : null;

  const handleRemove = useCallback(() => {
    setFile(null);
    setPhase('upload');
    workerReset();
    setPlacements([]);
    setSignatureDataUrl(null);
    setInitialsDataUrl(null);
    setActiveGhost(null);
    setCurrentPage(0);
    pdfDataRef.current = null;
  }, [workerReset]);

  const ghostImage = activeGhost === 'initials' ? initialsDataUrl : activeGhost === 'signature' ? signatureDataUrl : null;

  return (
    <div className="space-y-6">
      {phase === 'upload' && <DropZone accept=".pdf" onFiles={handleFiles} compact />}

      {file && phase !== 'upload' && (
        <>
          <FileCard file={file} onRemove={handleRemove} />

          {pdf.error && (
            <p className="text-sm text-rose-600 font-bold text-center">{pdf.error}</p>
          )}

          {pdf.isLoading && (
            <p className="text-sm text-slate-500 text-center font-medium">Loading PDF...</p>
          )}

          {(phase === 'create-signature' || phase === 'create-initials') && !resultBlob && (
            <div className="p-6 bg-white rounded-2xl border-[3px] border-slate-900 shadow-[var(--shadow-brutalist-sm)]">
              <SignatureCreator
                mode={phase === 'create-initials' ? 'initials' : 'signature'}
                onConfirm={phase === 'create-initials' ? handleInitialsConfirm : handleSignatureConfirm}
              />
            </div>
          )}

          {phase === 'place' && !resultBlob && !workerState.isProcessing && (
            <>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {signatureDataUrl && (
                  <Button
                    variant={activeGhost === 'signature' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setActiveGhost(activeGhost === 'signature' ? null : 'signature')}
                  >
                    <PenLine size={16} />
                    Place signature
                  </Button>
                )}
                {initialsDataUrl ? (
                  <Button
                    variant={activeGhost === 'initials' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setActiveGhost(activeGhost === 'initials' ? null : 'initials')}
                  >
                    <Stamp size={16} />
                    Place initials
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPhase('create-initials')}
                  >
                    <Stamp size={16} />
                    Add initials
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSignatureDataUrl(null);
                    setPhase('create-signature');
                  }}
                >
                  <ArrowLeft size={16} />
                  New signature
                </Button>
              </div>

              {activeGhost && (
                <p className="text-sm text-indigo-600 font-bold text-center">
                  Click on the PDF to place your {activeGhost === 'initials' ? 'initials' : 'signature'}
                </p>
              )}

              <div className="flex justify-center">
                <PdfPageViewer
                  pageIndex={currentPage}
                  renderPage={renderPageWithInfo}
                  placements={placements}
                  ghostImage={ghostImage}
                  onPlaceSignature={handlePlaceSignature}
                  onUpdatePlacement={handleUpdatePlacement}
                  onRemovePlacement={handleRemovePlacement}
                />
              </div>

              {pdf.totalPages > 1 && (
                <PageNavigator
                  currentPage={currentPage}
                  totalPages={pdf.totalPages}
                  onPageChange={setCurrentPage}
                />
              )}

              {placements.length > 0 && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-slate-500 font-medium">
                    {placements.length} placement{placements.length > 1 ? 's' : ''} added
                  </p>
                  <Button onClick={handleSign} size="lg">
                    <PenLine size={20} />
                    Sign PDF
                  </Button>
                </div>
              )}
            </>
          )}

          {workerState.isProcessing && (
            <div className="space-y-2">
              <ProgressBar value={workerState.progress} />
              <p className="text-sm text-slate-500 text-center font-medium">Signing...</p>
            </div>
          )}

          {workerState.error && (
            <p className="text-sm text-rose-600 font-bold text-center">{workerState.error}</p>
          )}

          {resultBlob && (
            <div className="flex justify-center">
              <DownloadButton blob={resultBlob} filename={workerState.result?.filename ?? ''} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import StatusMessage from '@/components/ui/StatusMessage';
import { useWorker } from '@/hooks/useWorker';
import { usePdfRenderer } from '@/hooks/usePdfRenderer';
import { toPdfCoords, type Placement, type SignaturePlacement } from '@/lib/pdf/sign';
import { fireConfetti } from '@/lib/confetti';
import SignatureCreator from './sign/SignatureCreator';
import PdfPageViewer from './sign/PdfPageViewer';
import PageNavigator from './sign/PageNavigator';
import { PenLine, Stamp, ArrowLeft } from 'lucide-react';

type Phase = 'upload' | 'create-signature' | 'create-initials' | 'place';

const SIGNATURE_DISPLAY_W = 150;
const SIGNATURE_DISPLAY_H = 50;
const INITIALS_DISPLAY_W = 80;
const INITIALS_DISPLAY_H = 40;

type StoredPageInfo = { widthPt: number; heightPt: number; widthPx: number; heightPx: number };

export default function SignPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('upload');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [initialsDataUrl, setInitialsDataUrl] = useState<string | null>(null);
  const [activeGhost, setActiveGhost] = useState<'signature' | 'initials' | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const pdfDataRef = useRef<ArrayBuffer | null>(null);
  const pageInfoRef = useRef<Map<number, StoredPageInfo>>(new Map());

  useEffect(() => {
    document.getElementById('dropzone-skeleton')?.remove();
  }, []);

  const pdf = usePdfRenderer();

  const worker = useWorker({
    createWorker: () =>
      new Worker(new URL('../../lib/workers/sign-pdf.worker.ts', import.meta.url), { type: 'module' }),
  });

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    worker.reset();
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
  }, [pdf, worker]);

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

  const handlePlaceSignature = useCallback((pageIndex: number, x: number, y: number) => {
    const ghost = activeGhost;
    const dataUrl = ghost === 'initials' ? initialsDataUrl : signatureDataUrl;
    if (!dataUrl) return;

    const isInitials = ghost === 'initials';
    const w = isInitials ? INITIALS_DISPLAY_W : SIGNATURE_DISPLAY_W;
    const h = isInitials ? INITIALS_DISPLAY_H : SIGNATURE_DISPLAY_H;

    const rand = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    const id = `${Date.now()}-${rand}`;
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

  const renderPageWithInfo = useCallback(async (canvas: HTMLCanvasElement, pageIndex: number) => {
    const info = await pdf.renderPage(canvas, pageIndex);
    pageInfoRef.current.set(pageIndex, info);
    return info;
  }, [pdf]);

  const handleSign = useCallback(async () => {
    if (!pdfDataRef.current || placements.length === 0) return;

    const pdfPlacements: SignaturePlacement[] = await Promise.all(
      placements.map(async (p) => {
        const pageInfo = pageInfoRef.current.get(p.pageIndex) ?? { widthPt: 612, heightPt: 792, widthPx: 612, heightPx: 792 };

        const coords = toPdfCoords(
          p.x, p.y, p.width, p.height,
          pageInfo.widthPx, pageInfo.heightPx,
          pageInfo.widthPt, pageInfo.heightPt,
        );

        if (!p.dataUrl.startsWith('data:')) throw new Error(`Invalid signature data URL for placement ${p.id}`);
        const buf = new Uint8Array(await fetch(p.dataUrl).then((r) => r.arrayBuffer()));

        return {
          pageIndex: p.pageIndex,
          xPdf: coords.xPdf,
          yPdf: coords.yPdf,
          widthPdf: coords.widthPdf,
          heightPdf: coords.heightPdf,
          imageBytes: buf,
        };
      })
    );

    const buffer = pdfDataRef.current.slice(0);
    worker.process(buffer, { placements: pdfPlacements }, file?.name);
  }, [placements, file, worker]);

  useEffect(() => {
    if (worker.result) fireConfetti();
  }, [worker.result]);

  const resultBlob = worker.result ? new Blob([worker.result.data], { type: 'application/pdf' }) : null;

  const handleRemove = useCallback(() => {
    setFile(null);
    setPhase('upload');
    worker.reset();
    setPlacements([]);
    setSignatureDataUrl(null);
    setInitialsDataUrl(null);
    setActiveGhost(null);
    setCurrentPage(0);
    pdfDataRef.current = null;
  }, [worker]);

  const ghostImageMap: Record<string, string | null> = {
    initials: initialsDataUrl,
    signature: signatureDataUrl,
  };
  const ghostImage = activeGhost ? ghostImageMap[activeGhost] : null;
  const ghostW = activeGhost === 'initials' ? INITIALS_DISPLAY_W : SIGNATURE_DISPLAY_W;
  const ghostH = activeGhost === 'initials' ? INITIALS_DISPLAY_H : SIGNATURE_DISPLAY_H;

  return (
    <div className="space-y-6">
      {phase === 'upload' && <DropZone accept=".pdf" onFiles={handleFiles} compact />}

      {file && phase !== 'upload' && (
        <>
          <FileCard file={file} onRemove={handleRemove} />

          {pdf.error && (
            <StatusMessage variant="error">{pdf.error}</StatusMessage>
          )}

          {pdf.isLoading && (
            <StatusMessage variant="loading">Loading PDF...</StatusMessage>
          )}

          {(phase === 'create-signature' || phase === 'create-initials') && !resultBlob && (
            <div className="p-6 bg-white rounded-2xl border-[3px] border-slate-900 shadow-[var(--shadow-brutalist-sm)]">
              <SignatureCreator
                mode={phase === 'create-initials' ? 'initials' : 'signature'}
                onConfirm={phase === 'create-initials' ? handleInitialsConfirm : handleSignatureConfirm}
              />
            </div>
          )}

          {phase === 'place' && !resultBlob && !worker.isProcessing && (
            <>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {signatureDataUrl && (
                  <Button
                    variant={activeGhost === 'signature' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setActiveGhost(activeGhost === 'signature' ? null : 'signature')}
                  >
                    <PenLine size={16} strokeWidth={2.5} />
                    Place signature
                  </Button>
                )}
                {initialsDataUrl ? (
                  <Button
                    variant={activeGhost === 'initials' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setActiveGhost(activeGhost === 'initials' ? null : 'initials')}
                  >
                    <Stamp size={16} strokeWidth={2.5} />
                    Place initials
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPhase('create-initials')}
                  >
                    <Stamp size={16} strokeWidth={2.5} />
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
                  <ArrowLeft size={16} strokeWidth={2.5} />
                  New signature
                </Button>
              </div>

              {activeGhost && (
                <StatusMessage variant="info">
                  Click on the PDF to place your {activeGhost === 'initials' ? 'initials' : 'signature'}
                </StatusMessage>
              )}

              <div className="flex justify-center">
                <PdfPageViewer
                  pageIndex={currentPage}
                  renderPage={renderPageWithInfo}
                  placements={placements}
                  ghostImage={ghostImage}
                  ghostWidth={ghostW}
                  ghostHeight={ghostH}
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
                    <PenLine size={20} strokeWidth={2.5} />
                    Sign PDF
                  </Button>
                </div>
              )}
            </>
          )}

          {worker.isProcessing && (
            <div className="space-y-2">
              <ProgressBar value={worker.progress} />
              <StatusMessage variant="loading">Signing...</StatusMessage>
            </div>
          )}

          {worker.error && (
            <StatusMessage variant="error">{worker.error}</StatusMessage>
          )}

          {resultBlob && (
            <div className="flex justify-center">
              <DownloadButton blob={resultBlob} filename={worker.result?.filename ?? ''} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

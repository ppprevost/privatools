import { useState, useCallback, useRef, useEffect } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import StatusMessage from '@/components/ui/StatusMessage';
import { useWorker } from '@/hooks/useWorker';
import { usePdfRenderer, type PageInfo } from '@/hooks/usePdfRenderer';
import { fireConfetti } from '@/lib/confetti';
import { detectEncryption } from '@/lib/pdf/detect-encryption';
import type { EditOp, FormField, ActiveTool } from '@/lib/pdf/edit-types';

const PX_PER_PT = 150 / 72; // 150 DPI rasterisation

function bytesToB64(bytes: Uint8ClampedArray | Uint8Array): string {
  let s = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...(bytes.subarray(i, i + chunk) as unknown as number[]));
  }
  return btoa(s);
}

type FreetextOp = Extract<EditOp, { type: 'freetext' }>;

function renderFreetextToImage(op: FreetextOp): Extract<EditOp, { type: 'freetext_image' }> | null {
  const wPx = Math.max(1, Math.round(op.width * PX_PER_PT));
  const hPx = Math.max(1, Math.round(op.height * PX_PER_PT));
  const canvas = document.createElement('canvas');
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const fs = op.fontSize * PX_PER_PT;
  ctx.font = `${op.italic ? 'italic ' : ''}${fs}px '${op.font}', cursive`;
  ctx.fillStyle = `rgb(${op.color.map((c) => Math.round(c * 255)).join(',')})`;
  for (const [i, line] of op.text.split('\n').entries()) {
    ctx.fillText(line, 2, fs * 0.85 + i * fs * 1.2);
  }
  const rgba = ctx.getImageData(0, 0, wPx, hPx).data;
  const rgb = new Uint8ClampedArray(wPx * hPx * 3);
  const alpha = new Uint8ClampedArray(wPx * hPx);
  for (let i = 0; i < wPx * hPx; i++) {
    rgb[i * 3] = rgba[i * 4]; rgb[i * 3 + 1] = rgba[i * 4 + 1]; rgb[i * 3 + 2] = rgba[i * 4 + 2];
    alpha[i] = rgba[i * 4 + 3];
  }
  return { type: 'freetext_image', page: op.page, x: op.x, y: op.y, width: op.width, height: op.height, imageWidth: wPx, imageHeight: hPx, rgbB64: bytesToB64(rgb), alphaB64: bytesToB64(alpha) };
}

async function processOpsForSave(ops: EditOp[]): Promise<EditOp[]> {
  return ops.map((op) => {
    if (op.type === 'freetext' && op.font && op.text.trim() !== '') {
      return renderFreetextToImage(op) ?? op;
    }
    return op;
  });
}
import ToolPalette from './edit/ToolPalette';
import EditablePageViewer from './edit/EditablePageViewer';
import FormPanel from './edit/FormPanel';
import ZoomControls from './edit/ZoomControls';
import PageNavigator from './sign/PageNavigator';
import { FilePen } from 'lucide-react';

type Phase = 'upload' | 'edit' | 'done';

const INITIAL_HISTORY: EditOp[][] = [[]];

export default function EditPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('upload');
  const [activeTool, setActiveTool] = useState<ActiveTool>('cursor');
  const [history, setHistory] = useState<EditOp[][]>(INITIAL_HISTORY);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);
  const [saveFilename, setSaveFilename] = useState('document_edit.pdf');
  const pdfDataRef = useRef<ArrayBuffer | null>(null);
  const pageInfoRef = useRef<PageInfo>({ widthPt: 612, heightPt: 792, widthPx: 612, heightPx: 792 });

  const historyRef = useRef(history);
  historyRef.current = history;
  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;

  const ops = history[historyIndex];

  const pdf = usePdfRenderer();

  const worker = useWorker({
    createWorker: () =>
      new Worker(new URL('../../lib/workers/edit-pdf.worker.ts', import.meta.url), { type: 'module' }),
  });

  const getFormFieldsFromWorker = useCallback((buffer: ArrayBuffer): Promise<FormField[]> => {
    return new Promise((resolve) => {
      const w = new Worker(new URL('../../lib/workers/edit-pdf.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent) => {
        w.terminate();
        if (e.data.type === 'result') {
          try {
            resolve(JSON.parse(e.data.result as string) as FormField[]);
          } catch {
            resolve([]);
          }
        } else {
          resolve([]);
        }
      };
      w.onerror = () => { w.terminate(); resolve([]); };
      w.postMessage({ action: 'get_form_fields', data: buffer });
    });
  }, []);

  const resetHistory = useCallback(() => {
    setHistory(INITIAL_HISTORY);
    setHistoryIndex(0);
  }, []);

  const pushHistory = useCallback((newOps: EditOp[]) => {
    setHistory((prev) => [...prev.slice(0, historyIndexRef.current + 1), newOps]);
    setHistoryIndex((prev) => prev + 1);
  }, []);

  // Debounced push for continuous changes (drag, typing)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOpsRef = useRef<EditOp[] | null>(null);

  const pushHistoryDebounced = useCallback((newOps: EditOp[]) => {
    pendingOpsRef.current = newOps;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (pendingOpsRef.current) {
        pushHistory(pendingOpsRef.current);
        pendingOpsRef.current = null;
      }
    }, 800);
  }, [pushHistory]);

  const flushPendingHistory = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingOpsRef.current) {
      pushHistory(pendingOpsRef.current);
      pendingOpsRef.current = null;
    }
  }, [pushHistory]);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;

    setFile(f);
    resetHistory();
    setFormFields([]);
    setActiveTool('cursor');
    setCurrentPage(0);
    setEncryptionError(null);
    setZoom(1.0);
    setSaveFilename(f.name.replace(/\.pdf$/i, '') + '_edit.pdf');
    worker.reset();

    const buffer = await f.arrayBuffer();
    const enc = await detectEncryption(buffer);
    if (enc.isEncrypted) {
      setEncryptionError('This PDF is password-protected. Please unlock it first.');
      return;
    }

    pdfDataRef.current = buffer;
    await pdf.loadPdf(buffer.slice(0));
    setPhase('edit');

    getFormFieldsFromWorker(buffer.slice(0)).then(setFormFields);
  }, [pdf, worker, getFormFieldsFromWorker, resetHistory]);

  const handleAddOp = useCallback((op: EditOp) => {
    flushPendingHistory();
    const newOps = [...historyRef.current[historyIndexRef.current], op];
    pushHistory(newOps);
  }, [pushHistory, flushPendingHistory]);

  const handleUpdateOp = useCallback((index: number, op: EditOp) => {
    const newOps = historyRef.current[historyIndexRef.current].map((o, i) => (i === index ? op : o));
    // Update history slice in-place for current index (live preview) then debounce commit
    setHistory((prev) => prev.map((snap, i) => i === historyIndexRef.current ? newOps : snap));
    pushHistoryDebounced(newOps);
  }, [pushHistoryDebounced]);

  const handleDeleteOp = useCallback((index: number) => {
    flushPendingHistory();
    const newOps = historyRef.current[historyIndexRef.current].filter((_, i) => i !== index);
    pushHistory(newOps);
  }, [pushHistory, flushPendingHistory]);

  const handleUndo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      pendingOpsRef.current = null;
    }
    setHistoryIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryIndex((prev) => Math.min(historyRef.current.length - 1, prev + 1));
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleDimensionsChange = useCallback((dims: PageInfo) => {
    pageInfoRef.current = dims;
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  const handleSave = useCallback(() => {
    if (!pdfDataRef.current) return;
    const currentOps = pendingOpsRef.current ?? historyRef.current[historyIndexRef.current];
    flushPendingHistory();
    const buffer = pdfDataRef.current.slice(0);
    processOpsForSave(currentOps).then((processedOps) => {
      const editsJson = JSON.stringify(processedOps);
      worker.process(buffer, { editsJson }, saveFilename);
    }).catch(console.error);
  }, [worker, saveFilename, flushPendingHistory]);

  useEffect(() => {
    if (worker.result) {
      fireConfetti();
      setPhase('done');
    }
  }, [worker.result]);

  const handleRemove = useCallback(() => {
    setFile(null);
    setPhase('upload');
    resetHistory();
    setFormFields([]);
    setActiveTool('cursor');
    setCurrentPage(0);
    setEncryptionError(null);
    pdfDataRef.current = null;
    worker.reset();
  }, [worker, resetHistory]);

  const resultBlob = worker.result ? new Blob([worker.result.data], { type: 'application/pdf' }) : null;

  return (
    <div className="space-y-6">
      {phase === 'upload' && <DropZone accept=".pdf" onFiles={handleFiles} compact />}

      {encryptionError && (
        <StatusMessage variant="error">{encryptionError}</StatusMessage>
      )}

      {file && phase !== 'upload' && (
        <>
          <FileCard file={file} onRemove={handleRemove} />

          {pdf.error && <StatusMessage variant="error">{pdf.error}</StatusMessage>}
          {pdf.isLoading && <StatusMessage variant="loading">Loading PDF...</StatusMessage>}

          {phase === 'edit' && !worker.isProcessing && (
            <>
              <ToolPalette
                activeTool={activeTool}
                onToolChange={(tool) => {
                  if (tool === 'scroll') window.getSelection()?.removeAllRanges();
                  setActiveTool(tool);
                }}
                hasFormFields={formFields.length > 0}
              />

              {activeTool === 'text-box' && (
                <StatusMessage variant="info">Click anywhere on the page to add a text box.</StatusMessage>
              )}
              {activeTool === 'highlight' && (
                <StatusMessage variant="info">Select text on the page to highlight it.</StatusMessage>
              )}
              {activeTool === 'edit-text' && (
                <StatusMessage variant="info">Click on existing text to edit it.</StatusMessage>
              )}

              <ZoomControls
                zoom={zoom}
                onZoomChange={setZoom}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onFullscreenToggle={() => setIsFullscreen(true)}
              />

              <div className="w-full">
                <EditablePageViewer
                  pageIndex={currentPage}
                  renderPage={pdf.renderPage}
                  renderTextLayer={pdf.renderTextLayer}
                  activeTool={activeTool}
                  ops={ops}
                  onAddOp={handleAddOp}
                  onUpdateOp={handleUpdateOp}
                  onDeleteOp={handleDeleteOp}
                  onDimensionsChange={handleDimensionsChange}
                  zoom={zoom}
                  onZoomChange={setZoom}
                />
              </div>

              {pdf.totalPages > 1 && (
                <PageNavigator
                  currentPage={currentPage}
                  totalPages={pdf.totalPages}
                  onPageChange={setCurrentPage}
                />
              )}

              {isFullscreen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
                  <div className="flex items-center gap-4 px-4 h-14 bg-white border-b border-slate-200 shadow-sm shrink-0">
                    <ToolPalette
                      activeTool={activeTool}
                      onToolChange={(tool) => {
                        if (tool === 'scroll') window.getSelection()?.removeAllRanges();
                        setActiveTool(tool);
                      }}
                      hasFormFields={formFields.length > 0}
                      compact
                    />
                    <div className="flex-1 flex justify-center">
                      <ZoomControls
                        zoom={zoom}
                        onZoomChange={setZoom}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                      />
                    </div>
                    <button
                      className="ml-auto w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors text-xl leading-none"
                      onClick={() => setIsFullscreen(false)}
                      title="Quitter le plein écran (Échap)"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 p-4 flex flex-col gap-3">
                    <EditablePageViewer
                      pageIndex={currentPage}
                      renderPage={pdf.renderPage}
                      renderTextLayer={pdf.renderTextLayer}
                      activeTool={activeTool}
                      ops={ops}
                      onAddOp={handleAddOp}
                      onUpdateOp={handleUpdateOp}
                      onDeleteOp={handleDeleteOp}
                      onDimensionsChange={handleDimensionsChange}
                      zoom={zoom}
                      onZoomChange={setZoom}
                      heightOverride="calc(100vh - 112px)"
                    />
                    {pdf.totalPages > 1 && (
                      <PageNavigator
                        currentPage={currentPage}
                        totalPages={pdf.totalPages}
                        onPageChange={setCurrentPage}
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTool === 'form' && (
                <FormPanel
                  fields={formFields}
                  ops={ops}
                  onOpsChange={(newOps) => pushHistory(newOps)}
                />
              )}

              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>Nom du fichier :</span>
                  <input
                    type="text"
                    className="border border-slate-300 rounded px-2 py-0.5 text-slate-700 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={saveFilename}
                    onChange={(e) => setSaveFilename(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <Button onClick={handleSave} size="lg">
                  <FilePen size={20} strokeWidth={2.5} />
                  Save PDF
                </Button>
              </div>
            </>
          )}

          {worker.isProcessing && (
            <div className="space-y-2">
              <ProgressBar value={worker.progress} />
              <StatusMessage variant="loading">Saving edits...</StatusMessage>
            </div>
          )}

          {worker.error && (
            <StatusMessage variant="error">{worker.error}</StatusMessage>
          )}

          {phase === 'done' && resultBlob && (
            <div className="flex justify-center">
              <DownloadButton blob={resultBlob} filename={worker.result?.filename ?? 'edited.pdf'} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

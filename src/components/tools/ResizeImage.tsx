import { useState, useCallback, useEffect } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import { useWorker } from '@/hooks/useWorker';
import { fireConfetti } from '@/lib/confetti';

export default function ResizeImage() {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [maintainAspect, setMaintainAspect] = useState(true);

  const worker = useWorker({
    createWorker: () =>
      new Worker(new URL('../../lib/workers/resize-image.worker.ts', import.meta.url), { type: 'module' }),
  });

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    worker.reset();
    const img = new Image();
    img.onload = () => {
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(files[0]);
  }, [worker]);

  const handleResize = useCallback(async () => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    worker.process(buffer, { width, height, maintainAspectRatio: maintainAspect, type: file.type }, file.name);
  }, [file, width, height, maintainAspect, worker]);

  useEffect(() => {
    if (worker.result) fireConfetti();
  }, [worker.result]);

  const resultBlob = worker.result ? new Blob([worker.result.data], { type: file?.type ?? 'image/jpeg' }) : null;

  return (
    <div className="space-y-6">
      {!file && <DropZone accept=".jpg,.jpeg,.png,.webp" onFiles={handleFiles} compact />}

      {file && (
        <>
          <FileCard file={file} onRemove={() => { setFile(null); worker.reset(); }} />

          {!worker.isProcessing && !resultBlob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Width (px)</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Height (px)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintainAspect}
                  onChange={(e) => setMaintainAspect(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-slate-900 accent-indigo-500"
                />
                <span className="text-sm font-bold text-slate-700">Maintain aspect ratio</span>
              </label>
            </div>
          )}

          {worker.isProcessing && (
            <div className="space-y-2">
              <ProgressBar value={worker.progress} />
              <p className="text-sm text-slate-500 text-center font-medium">Resizing...</p>
            </div>
          )}

          {worker.error && <p className="text-sm text-rose-600 font-bold text-center">{worker.error}</p>}

          {!worker.isProcessing && !resultBlob && (
            <div className="flex justify-center">
              <Button onClick={handleResize} size="lg">Resize Image</Button>
            </div>
          )}

          {resultBlob && (
            <div className="flex justify-center">
              <DownloadButton blob={resultBlob} filename={worker.result!.filename} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

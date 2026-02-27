import { useState, useCallback, useRef, useEffect } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import { useWorker } from '@/hooks/useWorker';

export default function CropImage() {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const worker = useWorker({
    createWorker: () =>
      new Worker(new URL('../../lib/workers/crop-image.worker.ts', import.meta.url), { type: 'module' }),
  });

  const handleFiles = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    worker.reset();
    const url = URL.createObjectURL(f);
    setImgUrl(url);
    const img = new Image();
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setCrop({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  }, [worker]);

  const handleCrop = useCallback(async () => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    worker.process(buffer, { ...crop, type: file.type }, file.name);
  }, [file, crop, worker]);

  const resultBlob = worker.result ? new Blob([worker.result.data], { type: file?.type ?? 'image/jpeg' }) : null;

  return (
    <div className="space-y-6">
      {!file && <DropZone accept=".jpg,.jpeg,.png,.webp" onFiles={handleFiles} compact />}

      {file && (
        <>
          <FileCard file={file} onRemove={() => { setFile(null); worker.reset(); setImgUrl(null); }} />

          {imgUrl && !resultBlob && (
            <div className="space-y-4">
              <div className="rounded-xl border-[3px] border-slate-900 overflow-hidden bg-slate-100">
                <img src={imgUrl} alt="Preview" className="max-w-full max-h-[400px] mx-auto" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">X</label>
                  <input type="number" value={crop.x} min={0} max={imgSize.w}
                    onChange={(e) => setCrop((c) => ({ ...c, x: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Y</label>
                  <input type="number" value={crop.y} min={0} max={imgSize.h}
                    onChange={(e) => setCrop((c) => ({ ...c, y: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Width</label>
                  <input type="number" value={crop.width} min={1} max={imgSize.w}
                    onChange={(e) => setCrop((c) => ({ ...c, width: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-3 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Height</label>
                  <input type="number" value={crop.height} min={1} max={imgSize.h}
                    onChange={(e) => setCrop((c) => ({ ...c, height: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-3 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {worker.isProcessing && (
            <div className="space-y-2">
              <ProgressBar value={worker.progress} />
              <p className="text-sm text-slate-500 text-center font-medium">Cropping...</p>
            </div>
          )}

          {worker.error && <p className="text-sm text-rose-600 font-bold text-center">{worker.error}</p>}

          {!worker.isProcessing && !resultBlob && file && (
            <div className="flex justify-center">
              <Button onClick={handleCrop} size="lg">Crop Image</Button>
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

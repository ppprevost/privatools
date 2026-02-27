import { useState, useCallback, useEffect } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import Slider from '@/components/ui/Slider';
import { useWorker } from '@/hooks/useWorker';
import { fireConfetti } from '@/lib/confetti';

export default function CompressImage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(80);
  const worker = useWorker({
    createWorker: () =>
      new Worker(new URL('../../lib/workers/compress-image.worker.ts', import.meta.url), { type: 'module' }),
  });

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    worker.reset();
  }, [worker]);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    worker.process(buffer, { quality: quality / 100, type: file.type }, file.name);
  }, [file, quality, worker]);

  useEffect(() => {
    if (worker.result) fireConfetti();
  }, [worker.result]);

  const resultBlob = worker.result ? new Blob([worker.result.data], { type: file?.type ?? 'image/jpeg' }) : null;

  return (
    <div className="space-y-6">
      {!file && <DropZone accept=".jpg,.jpeg,.png,.webp" onFiles={handleFiles} compact />}

      {file && (
        <>
          <FileCard
            file={file}
            onRemove={() => { setFile(null); worker.reset(); }}
            resultSize={resultBlob?.size}
          />

          {!worker.isProcessing && !resultBlob && (
            <Slider label="Quality" value={quality} min={10} max={100} step={5} unit="%" onChange={setQuality} />
          )}

          {worker.isProcessing && (
            <div className="space-y-2">
              <ProgressBar value={worker.progress} />
              <p className="text-sm text-slate-500 text-center font-medium">Compressing...</p>
            </div>
          )}

          {worker.error && <p className="text-sm text-rose-600 font-bold text-center">{worker.error}</p>}

          {!worker.isProcessing && !resultBlob && (
            <div className="flex justify-center">
              <Button onClick={handleCompress} size="lg">Compress Image</Button>
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

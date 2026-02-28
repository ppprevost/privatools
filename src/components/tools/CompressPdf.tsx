import { useState, useCallback, useEffect } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import { useWorker } from '@/hooks/useWorker';
import { fireConfetti } from '@/lib/confetti';

export default function CompressPdf() {
  const [file, setFile] = useState<File | null>(null);
  const worker = useWorker({
    createWorker: () =>
      new Worker(new URL('../../lib/workers/compress-pdf.worker.ts', import.meta.url), { type: 'module' }),
  });

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    worker.reset();
  }, [worker]);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    worker.process(buffer, { stripMetadata: true }, file.name);
  }, [file, worker]);

  useEffect(() => {
    if (worker.result) fireConfetti();
  }, [worker.result]);

  const resultBlob = worker.result ? new Blob([worker.result.data], { type: 'application/pdf' }) : null;

  return (
    <div className="space-y-6">
      {!file && <DropZone accept=".pdf" onFiles={handleFiles} compact />}

      {file && (
        <>
          <FileCard
            file={file}
            onRemove={() => { setFile(null); worker.reset(); }}
            resultSize={resultBlob?.size}
          />

          {worker.isProcessing && (
            <div className="space-y-2">
              <ProgressBar value={worker.progress} />
              <p className="text-sm text-slate-500 text-center font-medium">Compressing...</p>
            </div>
          )}

          {worker.error && (
            <p className="text-sm text-rose-600 font-bold text-center">{worker.error}</p>
          )}

          {!worker.isProcessing && !resultBlob && (
            <div className="flex justify-center">
              <Button onClick={handleCompress} size="lg">Compress PDF</Button>
            </div>
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

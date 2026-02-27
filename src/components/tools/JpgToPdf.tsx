import { useState, useCallback, useEffect } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import { useWorker } from '@/hooks/useWorker';
import { fireConfetti } from '@/lib/confetti';

export default function JpgToPdf() {
  const [files, setFiles] = useState<File[]>([]);
  const worker = useWorker({
    createWorker: () =>
      new Worker(new URL('../../lib/workers/jpg-to-pdf.worker.ts', import.meta.url), { type: 'module' }),
  });

  const handleFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    worker.reset();
  }, [worker]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleConvert = useCallback(async () => {
    if (files.length === 0) return;
    const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
    worker.process(new ArrayBuffer(0), { files: buffers, names: files.map((f) => f.name) }, files[0].name);
  }, [files, worker]);

  useEffect(() => {
    if (worker.result) fireConfetti();
  }, [worker.result]);

  const resultBlob = worker.result ? new Blob([worker.result.data], { type: 'application/pdf' }) : null;

  return (
    <div className="space-y-6">
      <DropZone accept=".jpg,.jpeg,.png,.webp" multiple onFiles={handleFiles} compact />

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file, i) => (
            <FileCard key={`${file.name}-${i}`} file={file} onRemove={() => removeFile(i)} />
          ))}
        </div>
      )}

      {worker.isProcessing && (
        <div className="space-y-2">
          <ProgressBar value={worker.progress} />
          <p className="text-sm text-slate-500 text-center font-medium">Converting...</p>
        </div>
      )}

      {worker.error && (
        <p className="text-sm text-rose-600 font-bold text-center">{worker.error}</p>
      )}

      {files.length > 0 && !worker.isProcessing && !resultBlob && (
        <div className="flex justify-center">
          <Button onClick={handleConvert} size="lg">Convert to PDF</Button>
        </div>
      )}

      {resultBlob && (
        <div className="flex justify-center">
          <DownloadButton blob={resultBlob} filename="images.pdf" />
        </div>
      )}
    </div>
  );
}

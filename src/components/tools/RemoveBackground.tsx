import { useState, useCallback, useEffect } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import { fireConfetti } from '@/lib/confetti';

export default function RemoveBackground() {
  useEffect(() => {
    import('@imgly/background-removal').then((m) => m.preload());
  }, []);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(files[0]);
    setResultBlob(null);
    setError(null);
    setPreviewUrl(URL.createObjectURL(files[0]));
  }, [previewUrl]);

  const handleRemove = useCallback(async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProgress(10);

    try {
      const { removeBackground } = await import('@imgly/background-removal');
      setProgress(30);

      const blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          const pct = total > 0 ? Math.round((current / total) * 60) + 30 : 30;
          setProgress(Math.min(pct, 95));
        },
      });

      setProgress(100);
      setResultBlob(blob);
      fireConfetti();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [file, previewUrl]);

  const resultFilename = file ? file.name.replace(/\.[^.]+$/, '_nobg.png') : 'result.png';

  return (
    <div className="space-y-6">
      {!file && <DropZone accept=".jpg,.jpeg,.png,.webp" onFiles={handleFiles} compact />}

      {file && (
        <>
          <FileCard
            file={file}
            onRemove={() => {
              setFile(null);
              setResultBlob(null);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }}
          />

          {previewUrl && (
            <div className="rounded-xl border-[3px] border-slate-900 overflow-hidden bg-[url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22><rect width=%228%22 height=%228%22 fill=%22%23f0f0f0%22/><rect x=%228%22 y=%228%22 width=%228%22 height=%228%22 fill=%22%23f0f0f0%22/></svg>')] bg-repeat">
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-[400px] mx-auto" />
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <ProgressBar value={progress} />
              <p className="text-sm text-slate-500 text-center font-medium">
                {progress < 30 ? 'Loading AI model...' : 'Removing background...'}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-rose-600 font-bold text-center">{error}</p>}

          {!isProcessing && !resultBlob && (
            <div className="flex justify-center">
              <Button onClick={handleRemove} size="lg">Remove Background</Button>
            </div>
          )}

          {resultBlob && (
            <div className="flex justify-center">
              <DownloadButton blob={resultBlob} filename={resultFilename} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

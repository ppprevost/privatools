import { useState, useCallback, useEffect, useRef } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import DownloadButton from '@/components/ui/DownloadButton';
import Slider from '@/components/ui/Slider';
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider';
import { fireConfetti } from '@/lib/confetti';

export default function CompressImage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(80);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState('');
  const hasFiredConfetti = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setResultBlob(null);
    setAfterUrl(null);
    hasFiredConfetti.current = false;
    setBeforeUrl(URL.createObjectURL(files[0]));
  }, []);

  const compress = useCallback(async (f: File, q: number) => {
    workerRef.current?.terminate();

    const worker = new Worker(
      new URL('../../lib/workers/compress-image.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    const buffer = await f.arrayBuffer();

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'result') {
        const blob = new Blob([msg.result], { type: f.type || 'image/jpeg' });
        setResultBlob(blob);
        setResultFilename(msg.filename ?? f.name);
        setAfterUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        if (!hasFiredConfetti.current) {
          hasFiredConfetti.current = true;
          fireConfetti();
        }
        worker.terminate();
      }
    };

    worker.postMessage({ data: buffer, options: { quality: q / 100, type: f.type }, filename: f.name }, [buffer]);
  }, []);

  useEffect(() => {
    if (!file) return;
    const timeout = setTimeout(() => compress(file, quality), 300);
    return () => clearTimeout(timeout);
  }, [file, quality, compress]);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setResultBlob(null);
    if (beforeUrl) URL.revokeObjectURL(beforeUrl);
    if (afterUrl) URL.revokeObjectURL(afterUrl);
    setBeforeUrl(null);
    setAfterUrl(null);
    workerRef.current?.terminate();
  }, [beforeUrl, afterUrl]);

  return (
    <div className="space-y-6">
      {!file && <DropZone accept=".jpg,.jpeg,.png,.webp" onFiles={handleFiles} compact />}

      {file && (
        <>
          <FileCard
            file={file}
            onRemove={handleRemove}
            resultSize={resultBlob?.size}
          />

          <Slider label="Quality" value={quality} min={10} max={100} step={5} unit="%" onChange={setQuality} />

          {beforeUrl && afterUrl && (
            <BeforeAfterSlider beforeSrc={beforeUrl} afterSrc={afterUrl} />
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

import { useState, useCallback, useEffect, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import { useWorker } from '@/hooks/useWorker';
import { fireConfetti } from '@/lib/confetti';

export default function CropImage() {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const worker = useWorker({
    createWorker: () =>
      new Worker(new URL('../../lib/workers/crop-image.worker.ts', import.meta.url), { type: 'module' }),
  });

  useEffect(() => {
    if (worker.result) fireConfetti();
  }, [worker.result]);

  const handleFiles = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    worker.reset();
    setCrop(undefined);
    setCompletedCrop(undefined);
    setImgUrl(URL.createObjectURL(f));
  }, [worker]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const size = Math.min(naturalWidth, naturalHeight) * 0.8;
    const x = (naturalWidth - size) / 2;
    const y = (naturalHeight - size) / 2;
    const initial: Crop = { unit: 'px', x, y, width: size, height: size };
    setCrop(initial);
  }, []);

  const handleCrop = useCallback(async () => {
    if (!file || !completedCrop || !imgRef.current) return;

    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const pixelCrop = {
      x: Math.round(completedCrop.x * scaleX),
      y: Math.round(completedCrop.y * scaleY),
      width: Math.round(completedCrop.width * scaleX),
      height: Math.round(completedCrop.height * scaleY),
    };

    const buffer = await file.arrayBuffer();
    worker.process(buffer, { ...pixelCrop, type: file.type }, file.name);
  }, [file, completedCrop, worker]);

  const resultBlob = worker.result ? new Blob([worker.result.data], { type: file?.type ?? 'image/jpeg' }) : null;

  return (
    <div className="space-y-6">
      {!file && <DropZone accept=".jpg,.jpeg,.png,.webp" onFiles={handleFiles} compact />}

      {file && (
        <>
          <FileCard file={file} onRemove={() => { setFile(null); worker.reset(); setImgUrl(null); }} />

          {imgUrl && !resultBlob && (
            <div className="rounded-xl border-[3px] border-slate-900 overflow-hidden bg-slate-100">
              <ReactCrop
                crop={crop}
                onChange={setCrop}
                onComplete={setCompletedCrop}
              >
                <img
                  ref={imgRef}
                  src={imgUrl}
                  alt="Preview"
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[500px] mx-auto block"
                />
              </ReactCrop>
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

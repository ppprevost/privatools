import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import Slider from '@/components/ui/Slider';
import { useWorker } from '@/hooks/useWorker';
import { fireConfetti } from '@/lib/confetti';

export default function CropImage() {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

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
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    setImgUrl(URL.createObjectURL(f));
  }, [worker]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleCrop = useCallback(async () => {
    if (!file || !croppedAreaPixels) return;
    const buffer = await file.arrayBuffer();
    worker.process(buffer, { ...croppedAreaPixels, type: file.type }, file.name);
  }, [file, croppedAreaPixels, worker]);

  const resultBlob = worker.result ? new Blob([worker.result.data], { type: file?.type ?? 'image/jpeg' }) : null;

  return (
    <div className="space-y-6">
      {!file && <DropZone accept=".jpg,.jpeg,.png,.webp" onFiles={handleFiles} compact />}

      {file && (
        <>
          <FileCard file={file} onRemove={() => { setFile(null); worker.reset(); setImgUrl(null); }} />

          {imgUrl && !resultBlob && (
            <div className="space-y-4">
              <div className="relative h-[400px] rounded-xl border-[3px] border-slate-900 overflow-hidden bg-slate-100">
                <Cropper
                  image={imgUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={undefined}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <Slider label="Zoom" value={zoom} min={1} max={3} step={0.1} unit="x" onChange={setZoom} />
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

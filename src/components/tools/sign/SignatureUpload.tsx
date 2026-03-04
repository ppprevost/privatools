import { useCallback } from 'react';
import DropZone from '@/components/ui/DropZone';

type SignatureUploadProps = {
  onConfirm: (dataUrl: string) => void;
};

const convertToPng = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Cannot get canvas context'));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });

export default function SignatureUpload({ onConfirm }: Readonly<SignatureUploadProps>) {
  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const dataUrl = await convertToPng(file);
    onConfirm(dataUrl);
  }, [onConfirm]);

  return (
    <div className="space-y-2">
      <DropZone accept=".png,.jpg,.jpeg" onFiles={handleFiles} compact />
      <p className="text-xs text-slate-400 text-center font-medium">
        Upload an image of your signature (PNG with transparent background works best)
      </p>
    </div>
  );
}

import { useRef, useEffect, useCallback } from 'react';
import SignaturePadLib from 'signature_pad';
import Button from '@/components/ui/Button';
import { Eraser, Check } from 'lucide-react';

type SignaturePadProps = {
  onConfirm: (dataUrl: string) => void;
  width?: number;
  height?: number;
};

export default function SignaturePad({ onConfirm, width = 600, height = 200 }: Readonly<SignaturePadProps>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: '#1e293b',
    });
    padRef.current = pad;

    return () => {
      pad.off();
    };
  }, [width, height]);

  const handleClear = useCallback(() => {
    padRef.current?.clear();
  }, []);

  const handleConfirm = useCallback(() => {
    if (!padRef.current || padRef.current.isEmpty()) return;
    const dataUrl = padRef.current.toDataURL('image/png');
    onConfirm(dataUrl);
  }, [onConfirm]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-[3px] border-slate-900 overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ maxWidth: `${width}px`, height: `${height}px` }}
        />
      </div>
      <p className="text-xs text-slate-400 text-center font-medium">Draw your signature above</p>
      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" onClick={handleClear}>
          <Eraser size={16} strokeWidth={2.5} />
          Clear
        </Button>
        <Button size="sm" onClick={handleConfirm}>
          <Check size={16} strokeWidth={2.5} />
          Confirm
        </Button>
      </div>
    </div>
  );
}

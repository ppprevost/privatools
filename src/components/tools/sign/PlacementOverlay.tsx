import { useState, useCallback, useRef, useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { X } from 'lucide-react';

export type Placement = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
};

type PlacementOverlayProps = {
  placement: Placement;
  onUpdate: (id: string, updates: Partial<Pick<Placement, 'x' | 'y' | 'width' | 'height'>>) => void;
  onRemove: (id: string) => void;
  containerWidth: number;
  containerHeight: number;
};

export default function PlacementOverlay({
  placement,
  onUpdate,
  onRemove,
  containerWidth,
  containerHeight,
}: Readonly<PlacementOverlayProps>) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef({ x: 0, y: 0, px: 0, py: 0, pw: 0, ph: 0 });

  const handleDragStart = useCallback((e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).dataset.resize) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      px: placement.x,
      py: placement.y,
      pw: placement.width,
      ph: placement.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [placement.x, placement.y, placement.width, placement.height]);

  const handleResizeStart = useCallback((e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      px: placement.x,
      py: placement.y,
      pw: placement.width,
      ph: placement.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [placement.x, placement.y, placement.width, placement.height]);

  const handlePointerMove = useCallback((e: ReactPointerEvent) => {
    if (!isDragging && !isResizing) return;
    e.preventDefault();

    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    if (isDragging) {
      const newX = Math.max(0, Math.min(containerWidth - placement.width, startRef.current.px + dx));
      const newY = Math.max(0, Math.min(containerHeight - placement.height, startRef.current.py + dy));
      onUpdate(placement.id, { x: newX, y: newY });
    }

    if (isResizing) {
      const aspect = startRef.current.pw / startRef.current.ph;
      const newW = Math.max(40, Math.min(containerWidth - placement.x, startRef.current.pw + dx));
      const newH = newW / aspect;
      if (placement.y + newH <= containerHeight) {
        onUpdate(placement.id, { width: newW, height: newH });
      }
    }
  }, [isDragging, isResizing, placement.id, placement.x, placement.y, placement.width, placement.height, containerWidth, containerHeight, onUpdate]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isDragging && !isResizing) return;
    const handler = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    window.addEventListener('pointerup', handler);
    return () => window.removeEventListener('pointerup', handler);
  }, [isDragging, isResizing]);

  return (
    <div
      className="absolute group"
      style={{
        left: placement.x,
        top: placement.y,
        width: placement.width,
        height: placement.height,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onPointerDown={handleDragStart}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="absolute inset-0 border-2 border-indigo-500 rounded-md border-dashed opacity-0 group-hover:opacity-100 transition-opacity" />

      <img
        src={placement.dataUrl}
        alt="Signature"
        className="w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
      />

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(placement.id); }}
        className="absolute -top-3 -right-3 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 cursor-pointer"
      >
        <X size={12} />
      </button>

      <div
        data-resize="true"
        onPointerDown={handleResizeStart}
        className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-indigo-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-se-resize"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}

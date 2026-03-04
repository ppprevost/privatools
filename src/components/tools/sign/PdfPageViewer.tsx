import { useRef, useEffect, useState, useCallback, type MouseEvent } from 'react';
import PlacementOverlay from './PlacementOverlay';
import type { Placement } from '@/lib/pdf/sign';
import type { PageInfo } from '@/hooks/usePdfRenderer';

type PdfPageViewerProps = {
  pageIndex: number;
  renderPage: (canvas: HTMLCanvasElement, pageIndex: number) => Promise<PageInfo>;
  placements: Placement[];
  ghostImage: string | null;
  ghostWidth: number;
  ghostHeight: number;
  onPlaceSignature: (pageIndex: number, x: number, y: number) => void;
  onUpdatePlacement: (id: string, updates: Partial<Pick<Placement, 'x' | 'y' | 'width' | 'height'>>) => void;
  onRemovePlacement: (id: string) => void;
};

export default function PdfPageViewer({
  pageIndex,
  renderPage,
  placements,
  ghostImage,
  ghostWidth,
  ghostHeight,
  onPlaceSignature,
  onUpdatePlacement,
  onRemovePlacement,
}: Readonly<PdfPageViewerProps>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    renderPage(canvas, pageIndex)
      .then((info) => {
        if (!cancelled) setDimensions({ width: info.widthPx, height: info.heightPx });
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to render page:', err);
      });

    return () => { cancelled = true; };
  }, [pageIndex, renderPage]);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!ghostImage || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onPlaceSignature(pageIndex, x, y);
  }, [ghostImage, pageIndex, onPlaceSignature]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ghostImage || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [ghostImage]);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  const pagePlacements = placements.filter((p) => p.pageIndex === pageIndex);

  return (
    <div
      ref={containerRef}
      className="relative inline-block rounded-xl border-[3px] border-slate-900 overflow-hidden bg-white shadow-[var(--shadow-brutalist-sm)]"
      style={{ width: dimensions.width || 'auto', cursor: ghostImage ? 'crosshair' : 'default' }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="block" />

      {pagePlacements.map((p) => (
        <PlacementOverlay
          key={p.id}
          placement={p}
          onUpdate={onUpdatePlacement}
          onRemove={onRemovePlacement}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
        />
      ))}

      {ghostImage && mousePos && (
        <img
          src={ghostImage}
          alt=""
          className="absolute pointer-events-none opacity-50"
          style={{
            left: mousePos.x - ghostWidth / 2,
            top: mousePos.y - ghostHeight / 2,
            width: ghostWidth,
            height: ghostHeight,
          }}
        />
      )}
    </div>
  );
}

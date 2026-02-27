import { useState, useCallback, useRef, useEffect, type PointerEvent } from 'react';

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
}

export default function BeforeAfterSlider({ beforeSrc, afterSrc }: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const onPointerDown = useCallback((e: PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (e.buttons === 0) return;
    updatePosition(e.clientX);
  }, [updatePosition]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border-[3px] border-slate-900 overflow-hidden select-none touch-none cursor-col-resize"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <img src={afterSrc} alt="After" className="block w-full" draggable={false} />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeSrc}
          alt="Before"
          className="block"
          style={{ width: `${containerWidth}px`, maxWidth: 'none' }}
          draggable={false}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border-[3px] border-slate-900 shadow-[var(--shadow-brutalist-sm)] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 8L1 5M4 8L1 11M4 8H1M12 8L15 5M12 8L15 11M12 8H15" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <span className="absolute top-3 left-3 px-2 py-1 bg-slate-900/70 text-white text-xs font-bold rounded-lg">Before</span>
      <span className="absolute top-3 right-3 px-2 py-1 bg-indigo-500/70 text-white text-xs font-bold rounded-lg">After</span>
    </div>
  );
}

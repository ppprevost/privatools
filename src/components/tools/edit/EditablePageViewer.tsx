import { useRef, useEffect, useCallback, useState, type MouseEvent } from 'react';
import type { PageInfo } from '@/hooks/usePdfRenderer';
import type { EditOp, ActiveTool } from '@/lib/pdf/edit-types';
import { toPdfCoords } from '@/lib/pdf/sign';
import AnnotationLayer from './AnnotationLayer';

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;

type Props = {
  pageIndex: number;
  renderPage: (canvas: HTMLCanvasElement, pageIndex: number, extraScale?: number) => Promise<PageInfo>;
  renderTextLayer: (container: HTMLDivElement, pageIndex: number, scale: number) => Promise<void>;
  activeTool: ActiveTool;
  ops: EditOp[];
  onAddOp: (op: EditOp) => void;
  onUpdateOp: (index: number, op: EditOp) => void;
  onDeleteOp: (index: number) => void;
  onDimensionsChange: (dims: PageInfo) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  heightOverride?: number | string;
};

export default function EditablePageViewer({
  pageIndex, renderPage, renderTextLayer, activeTool, ops, onAddOp, onUpdateOp, onDeleteOp, onDimensionsChange, zoom, onZoomChange, heightOverride,
}: Readonly<Props>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  const [pageInfo, setPageInfo] = useState<PageInfo>({ widthPt: 612, heightPt: 792, widthPx: 612, heightPx: 792 });
  const [baseDims, setBaseDims] = useState({ w: 0, h: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const pageInfoRef = useRef(pageInfo);
  pageInfoRef.current = pageInfo;

  // Refs for use inside native event handlers (avoid stale closures)
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  const internalZoomRef = useRef(zoom);
  const activeToolRef = useRef(activeTool);
  panRef.current = pan;
  scaleRef.current = scale;
  activeToolRef.current = activeTool;

  const lastRenderedScaleRef = useRef(1.0);

  // --- Page render ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    lastRenderedScaleRef.current = 1.0;
    renderPage(canvas, pageIndex, 1.0).then((info) => {
      if (!cancelled) {
        setPageInfo(info);
        onDimensionsChange(info);
        setBaseDims({ w: info.widthPx, h: info.heightPx });
        setPan({ x: 0, y: 0 });
        setScale(1.0);
        internalZoomRef.current = 1.0;
      }
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [pageIndex, renderPage, onDimensionsChange]);

  // --- Render text layer after baseDims are set (textLayerRef is mounted) ---
  useEffect(() => {
    if (baseDims.w === 0) return;
    const textLayer = textLayerRef.current;
    if (!textLayer) return;
    const info = pageInfoRef.current;
    const s = info.widthPx / info.widthPt;
    renderTextLayer(textLayer, pageIndex, s).catch(console.error);
  }, [baseDims, pageIndex, renderTextLayer]);

  // --- Re-render at zoom resolution after zoom settles ---
  useEffect(() => {
    if (baseDims.w === 0) return;
    const id = setTimeout(() => {
      if (Math.abs(scale - lastRenderedScaleRef.current) < 0.05) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      lastRenderedScaleRef.current = scale;
      renderPage(canvas, pageIndex, scale).catch(console.error);
    }, 350);
    return () => clearTimeout(id);
  }, [scale, pageIndex, renderPage, baseDims.w]);

  // --- Sync external zoom from ZoomControls buttons ---
  useEffect(() => {
    if (Math.abs(zoom - internalZoomRef.current) < 0.01) return;
    internalZoomRef.current = zoom;
    const vp = viewportRef.current;
    if (!vp) { setScale(zoom); return; }
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    const prev = scaleRef.current;
    const { x: px, y: py } = panRef.current;
    const worldX = (cx - px) / prev;
    const worldY = (cy - py) / prev;
    setScale(zoom);
    setPan({ x: cx - worldX * zoom, y: cy - worldY * zoom });
  }, [zoom]);

  // --- Wheel + touch: non-passive native listeners ---
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const applyZoom = (rawScale: number, pivotX: number, pivotY: number) => {
      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, rawScale));
      const prev = scaleRef.current;
      const { x: px, y: py } = panRef.current;
      const wx = (pivotX - px) / prev;
      const wy = (pivotY - py) / prev;
      setPan({ x: pivotX - wx * clamped, y: pivotY - wy * clamped });
      setScale(clamped);
      internalZoomRef.current = clamped;
      onZoomChange(clamped);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (activeToolRef.current === 'scroll') {
        const lineSize = e.deltaMode === 1 ? 20 : 1;
        setPan((p) => ({ x: p.x - e.deltaX * lineSize, y: p.y - e.deltaY * lineSize }));
        return;
      }
      const rect = vp.getBoundingClientRect();
      const factor = e.deltaMode === 1 ? 0.1 : 0.002;
      applyZoom(scaleRef.current * (1 - e.deltaY * factor), e.clientX - rect.left, e.clientY - rect.top);
    };

    type TouchPos = { x: number; y: number };
    const ts: { touches: Map<number, TouchPos>; lastDist: number; lastMidX: number; lastMidY: number } =
      { touches: new Map(), lastDist: 0, lastMidX: 0, lastMidY: 0 };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        ts.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
      if (ts.touches.size >= 2) {
        const [a, b] = Array.from(ts.touches.values());
        ts.lastDist = Math.hypot(b.x - a.x, b.y - a.y);
        ts.lastMidX = (a.x + b.x) / 2;
        ts.lastMidY = (a.y + b.y) / 2;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();

      if (ts.touches.size <= 1 && e.touches.length === 1) {
        const t = e.touches[0];
        const prev = ts.touches.get(t.identifier);
        if (prev) {
          setPan(p => ({ x: p.x + t.clientX - prev.x, y: p.y + t.clientY - prev.y }));
          ts.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
        }
      } else if (e.touches.length >= 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const newMidX = (t0.clientX + t1.clientX) / 2;
        const newMidY = (t0.clientY + t1.clientY) / 2;

        if (ts.lastDist > 0) {
          const pivotX = newMidX - rect.left;
          const pivotY = newMidY - rect.top;
          const dmx = newMidX - ts.lastMidX;
          const dmy = newMidY - ts.lastMidY;
          const pinchRatio = newDist / ts.lastDist;
          const prev = scaleRef.current;
          const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * pinchRatio));
          const { x: px, y: py } = panRef.current;
          setPan({ x: pivotX - ((pivotX - px) / prev) * clamped + dmx, y: pivotY - ((pivotY - py) / prev) * clamped + dmy });
          setScale(clamped);
          internalZoomRef.current = clamped;
          onZoomChange(clamped);
        }

        ts.lastDist = newDist;
        ts.lastMidX = newMidX;
        ts.lastMidY = newMidY;
        ts.touches.set(t0.identifier, { x: t0.clientX, y: t0.clientY });
        ts.touches.set(t1.identifier, { x: t1.clientX, y: t1.clientY });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) ts.touches.delete(t.identifier);
      if (ts.touches.size < 2) ts.lastDist = 0;
    };

    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('touchstart', onTouchStart, { passive: false });
    vp.addEventListener('touchmove', onTouchMove, { passive: false });
    vp.addEventListener('touchend', onTouchEnd);
    return () => {
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('touchstart', onTouchStart);
      vp.removeEventListener('touchmove', onTouchMove);
      vp.removeEventListener('touchend', onTouchEnd);
    };
  }, [onZoomChange]);

  // --- Mouse pan ---
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, moved: false });

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (activeTool === 'highlight') return;
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: false };
    setIsDragging(true);
    e.preventDefault();
  }, [activeTool]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    const { active, moved } = dragRef.current;
    dragRef.current.active = false;
    setIsDragging(false);
    if (!active || moved) return;

    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cx = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
    const cy = (e.clientY - rect.top - panRef.current.y) / scaleRef.current;
    const info = pageInfo;

    if (activeTool === 'text-box') {
      const W = 150; const H = 30;
      const c = toPdfCoords(cx, cy, W, H, info.widthPx, info.heightPx, info.widthPt, info.heightPt);
      onAddOp({ type: 'freetext', page: pageIndex, x: c.xPdf, y: c.yPdf, width: c.widthPdf, height: c.heightPdf, text: '', fontSize: 12, color: [0, 0, 0] });
    }
  }, [activeTool, pageIndex, onAddOp, pageInfo]);

  // --- Highlight: window-level mouseup to catch release outside viewport ---
  useEffect(() => {
    if (activeTool !== 'highlight') return;
    const onWindowMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const s = scaleRef.current;
      const { x: px, y: py } = panRef.current;
      const info = pageInfo;
      const quadPoints: number[] = [];
      for (const r of Array.from(sel.getRangeAt(0).getClientRects())) {
        if (r.width < 1 || r.height < 1) continue;
        const x1 = (r.left - rect.left - px) / s;
        const y1 = (r.top - rect.top - py) / s;
        const x2 = (r.right - rect.left - px) / s;
        const y2 = (r.bottom - rect.top - py) / s;
        const sx = info.widthPt / info.widthPx;
        const sy = info.heightPt / info.heightPx;
        quadPoints.push(x1 * sx, info.heightPt - y1 * sy, x2 * sx, info.heightPt - y1 * sy, x1 * sx, info.heightPt - y2 * sy, x2 * sx, info.heightPt - y2 * sy);
      }
      if (quadPoints.length >= 8) {
        onAddOp({ type: 'highlight', page: pageIndex, quadPoints, color: [1, 0.84, 0] });
      }
      sel.removeAllRanges();
    };
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, [activeTool, pageIndex, onAddOp, pageInfo]);

  // --- Edit-text: click on text span ---
  const handleTextLayerClick = useCallback((e: MouseEvent) => {
    if (activeTool !== 'edit-text') return;
    const target = e.target as HTMLElement;
    if (target.tagName !== 'SPAN') return;
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const s = scaleRef.current;
    const { x: px, y: py } = panRef.current;
    const sr = target.getBoundingClientRect();
    const cx = (sr.left - rect.left - px) / s;
    const cy = (sr.top - rect.top - py) / s;
    const w = (sr.width || 80) / s;
    const h = (sr.height || 16) / s;
    const info = pageInfo;
    const c = toPdfCoords(cx, cy, w, h, info.widthPx, info.heightPx, info.widthPt, info.heightPt);
    onAddOp({ type: 'text_overlay', page: pageIndex, coverRect: [c.xPdf, c.yPdf, c.widthPdf, c.heightPdf], text: target.textContent ?? '', fontSize: 12, x: c.xPdf, y: c.yPdf + c.heightPdf });
  }, [activeTool, pageIndex, onAddOp, pageInfo]);

  const viewportHeight = heightOverride ?? (baseDims.h > 0 ? Math.min(baseDims.h, 650) : 500);
  const textPointerEvents: React.CSSProperties['pointerEvents'] = (activeTool === 'highlight' || activeTool === 'edit-text') ? 'auto' : 'none';
  const cursorMap: Record<string, string> = { 'text-box': 'crosshair', highlight: 'default', cursor: 'default' };
  const cursor = cursorMap[activeTool] ?? (isDragging ? 'grabbing' : 'grab');

  return (
    <div
      ref={viewportRef}
      className="relative w-full rounded-xl border-[3px] border-slate-900 overflow-hidden bg-slate-100 shadow-[var(--shadow-brutalist-sm)]"
      style={{ height: viewportHeight, cursor, userSelect: activeTool === 'highlight' ? 'text' : 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { dragRef.current.active = false; setIsDragging(false); }}
    >
      <div
        style={baseDims.w > 0 ? {
          position: 'absolute',
          width: baseDims.w,
          height: baseDims.h,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        } : { position: 'absolute', width: '100%' }}
      >
        <canvas ref={canvasRef} className="block" />
        {baseDims.w > 0 && (
          <>
            <div
              ref={textLayerRef}
              className="absolute inset-0 pdf-text-layer"
              style={{ pointerEvents: textPointerEvents }}
              onClick={handleTextLayerClick}
            />
            <AnnotationLayer ops={ops} pageIndex={pageIndex} dimensions={pageInfo} onUpdateOp={onUpdateOp} onDeleteOp={onDeleteOp} viewScale={scale} />
          </>
        )}
      </div>
      {baseDims.w === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-slate-400 text-sm font-medium">Loading...</span>
        </div>
      )}
    </div>
  );
}

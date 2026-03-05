import { useState, useRef, useCallback, useEffect } from 'react';
import { Check, GripHorizontal } from 'lucide-react';
import type { EditOp } from '@/lib/pdf/edit-types';

let fontsLoaded = false;
const ensureFontsLoaded = () => {
  if (fontsLoaded) return;
  fontsLoaded = true;
  Promise.all([
    import('@fontsource/satisfy/files/satisfy-latin-400-normal.woff2?url').then((m) => m.default),
    import('@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff2?url').then((m) => m.default),
    import('@fontsource/pacifico/files/pacifico-latin-400-normal.woff2?url').then((m) => m.default),
  ]).then(([satisfyUrl, dancingUrl, pacificoUrl]) =>
    Promise.all([
      new FontFace('Satisfy', `url(${satisfyUrl})`).load().then((f) => document.fonts.add(f)),
      new FontFace('Dancing Script', `url(${dancingUrl})`).load().then((f) => document.fonts.add(f)),
      new FontFace('Pacifico', `url(${pacificoUrl})`).load().then((f) => document.fonts.add(f)),
    ])
  ).catch(() => { fontsLoaded = false; });
};

const FONTS: Array<{ label: string; family: string | undefined }> = [
  { label: 'Aa', family: undefined },
  { label: 'Aa', family: 'Satisfy' },
  { label: 'Aa', family: 'Dancing Script' },
  { label: 'Aa', family: 'Pacifico' },
];

type PageDimensions = { widthPt: number; heightPt: number; widthPx: number; heightPx: number };

type AnnotationLayerProps = {
  ops: EditOp[];
  pageIndex: number;
  dimensions: PageDimensions;
  onUpdateOp: (index: number, op: EditOp) => void;
  onDeleteOp: (index: number) => void;
  viewScale: number;
};

function pdfToCss(pdfX: number, pdfY: number, w: number, h: number, dims: PageDimensions) {
  const scaleX = dims.widthPx / dims.widthPt;
  const scaleY = dims.heightPx / dims.heightPt;
  return {
    left: pdfX * scaleX,
    top: (dims.heightPt - pdfY - h) * scaleY,
    width: w * scaleX,
    height: h * scaleY,
  };
}

export default function AnnotationLayer({ ops, pageIndex, dimensions, onUpdateOp, onDeleteOp, viewScale }: Readonly<AnnotationLayerProps>) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {ops.map((op, index) => {
        const k = `${op.type}-${op.page}-${index}`;
        if (op.type === 'freetext' && op.page === pageIndex) {
          return (
            <FreetextAnnot
              key={k}
              op={op}
              dims={dimensions}
              viewScale={viewScale}
              onUpdate={(updated) => onUpdateOp(index, updated)}
              onDelete={() => onDeleteOp(index)}
            />
          );
        }
        if (op.type === 'highlight' && op.page === pageIndex) {
          return <HighlightAnnot key={k} op={op} dims={dimensions} />;
        }
        if (op.type === 'text_overlay' && op.page === pageIndex) {
          return <TextOverlayAnnot key={k} op={op} dims={dimensions} onUpdate={(updated) => onUpdateOp(index, updated)} />;
        }
        return null;
      })}
    </div>
  );
}

const COLORS: Array<{ label: string; rgb: [number, number, number] }> = [
  { label: 'Noir', rgb: [0, 0, 0] },
  { label: 'Rouge', rgb: [0.8, 0, 0] },
  { label: 'Bleu', rgb: [0, 0.2, 0.8] },
  { label: 'Vert', rgb: [0, 0.5, 0] },
];

type FreetextAnnotProps = {
  op: Extract<EditOp, { type: 'freetext' }>;
  dims: PageDimensions;
  viewScale: number;
  onUpdate: (op: EditOp) => void;
  onDelete: () => void;
};

function FreetextAnnot({ op, dims, viewScale, onUpdate, onDelete }: Readonly<FreetextAnnotProps>) {
  const [selected, setSelected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ensureFontsLoaded(); }, []);

  const isNew = op.text === '';
  useEffect(() => {
    if (isNew) {
      setSelected(true);
      textareaRef.current?.focus();
    }
  }, [isNew]);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const opRef = useRef(op);
  const onUpdateRef = useRef(onUpdate);
  opRef.current = op;
  onUpdateRef.current = onUpdate;

  const pos = pdfToCss(op.x, op.y, op.width, op.height, dims);
  const textColor = `rgb(${op.color.map((c) => Math.round(c * 255)).join(',')})`;
  const scaleY = dims.heightPx / dims.heightPt;

  // Auto-resize height on text change
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const newH = ta.scrollHeight;
    ta.style.height = `${newH}px`;
    const newHeightPdf = newH / scaleY;
    if (Math.abs(newHeightPdf - opRef.current.height) > 0.5) {
      onUpdateRef.current({ ...opRef.current, height: newHeightPdf });
    }
  }, [op.text, scaleY]);

  useEffect(() => {
    if (!selected) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setSelected(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [selected]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelected(true);
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, origX: opRef.current.x, origY: opRef.current.y };
    const pdfSX = dims.widthPx / dims.widthPt;
    const pdfSY = dims.heightPx / dims.heightPt;
    const onMove = (me: MouseEvent) => {
      const dx = (me.clientX - dragRef.current.startX) / (viewScale * pdfSX);
      const dy = (me.clientY - dragRef.current.startY) / (viewScale * pdfSY);
      onUpdate({ ...opRef.current, x: dragRef.current.origX + dx, y: dragRef.current.origY - dy });
    };
    const onUp = () => { dragRef.current.active = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [dims, viewScale, onUpdate]);

  const startResize = useCallback((e: React.MouseEvent, direction: 'right' | 'bottom' | 'corner') => {
    e.stopPropagation();
    e.preventDefault();
    const origW = opRef.current.width;
    const origH = opRef.current.height;
    const origY = opRef.current.y;
    const startX = e.clientX;
    const startY = e.clientY;
    const pdfSX = dims.widthPx / dims.widthPt;
    const pdfSY = dims.heightPx / dims.heightPt;
    const onMove = (me: MouseEvent) => {
      const dx = (me.clientX - startX) / (viewScale * pdfSX);
      const dy = (me.clientY - startY) / (viewScale * pdfSY);
      const update: Partial<typeof opRef.current> = {};
      if (direction === 'right' || direction === 'corner') update.width = Math.max(40 / pdfSX, origW + dx);
      if (direction === 'bottom' || direction === 'corner') { update.height = Math.max(20 / pdfSY, origH + dy); update.y = origY - dy; }
      onUpdateRef.current({ ...opRef.current, ...update });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [dims, viewScale]);

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-auto"
      style={{
        left: pos.left,
        top: pos.top,
        width: pos.width,
        minHeight: pos.height,
        cursor: 'move',
        outline: selected ? '2px solid rgb(99,102,241)' : '1.5px dashed rgb(165,180,252)',
        outlineOffset: '1px',
      }}
      onMouseDown={startDrag}
    >
      {/* Drag handle — floats above the box */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-5 h-4 px-2 flex items-center justify-center z-10 cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity bg-white rounded border border-slate-200 shadow-sm"
        onMouseDown={startDrag}
        title="Déplacer"
      >
        <GripHorizontal size={12} className="text-slate-500 pointer-events-none" />
      </div>

      <textarea
        ref={textareaRef}
        className="w-full resize-none bg-white/80 text-slate-900 p-1 rounded text-xs focus:outline-none overflow-hidden"
        style={{
          fontSize: op.fontSize,
          color: textColor,
          cursor: 'text',
          minHeight: pos.height,
          height: pos.height,
          fontFamily: op.font ? `'${op.font}', cursive` : 'inherit',
          fontStyle: op.italic ? 'italic' : 'normal',
        }}
        value={op.text}
        onChange={(e) => onUpdate({ ...op, text: e.target.value })}
        onMouseDown={(e) => e.stopPropagation()}
        onFocus={() => setSelected(true)}
      />

      {/* Resize handles — always visible on hover, prominent when selected */}
      <div
        className={`absolute top-0 bottom-0 -right-1 w-2 ${selected ? 'opacity-100' : 'opacity-0 hover:opacity-100'} transition-opacity`}
        style={{ cursor: 'ew-resize', background: selected ? 'rgba(99,102,241,0.25)' : 'transparent', borderRadius: '0 4px 4px 0' }}
        onMouseDown={(e) => startResize(e, 'right')}
        title="Redimensionner la largeur"
      />
      <div
        className={`absolute left-0 right-0 -bottom-1 h-2 ${selected ? 'opacity-100' : 'opacity-0 hover:opacity-100'} transition-opacity`}
        style={{ cursor: 'ns-resize', background: selected ? 'rgba(99,102,241,0.25)' : 'transparent', borderRadius: '0 0 4px 4px' }}
        onMouseDown={(e) => startResize(e, 'bottom')}
        title="Redimensionner la hauteur"
      />
      <div
        className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-sm ${selected ? 'opacity-100 bg-indigo-400' : 'opacity-0 hover:opacity-100 bg-indigo-300'} transition-opacity`}
        style={{ cursor: 'nwse-resize' }}
        onMouseDown={(e) => startResize(e, 'corner')}
        title="Redimensionner"
      />

      {selected && (
        <>
          <button
            className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors z-20"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => setSelected(false)}
            title="Valider"
          >
            <Check size={11} strokeWidth={3} />
          </button>
          <button
            className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-slate-700 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-500 transition-colors z-20 leading-none"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={onDelete}
          >
            ×
          </button>

          <div
            className="absolute left-0 flex items-center gap-1 bg-white border border-slate-200 rounded-lg shadow-lg px-2 py-1 z-20 whitespace-nowrap"
            style={{ top: 'calc(100% + 8px)' }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <button
              className={`w-5 h-5 flex items-center justify-center text-sm font-italic rounded transition-colors ${op.italic ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
              style={{ fontStyle: 'italic', fontFamily: 'serif' }}
              onClick={() => onUpdate({ ...op, italic: !op.italic })}
              title="Italique"
            >I</button>
            <div className="w-px h-3 bg-slate-200 mx-0.5" />
            {FONTS.map(({ label, family }) => (
              <button
                key={family ?? 'default'}
                title={family ?? 'Défaut'}
                className="h-5 px-1 flex items-center justify-center text-sm rounded transition-colors hover:bg-slate-100"
                style={{
                  fontFamily: family ? `'${family}', cursive` : 'inherit',
                  outline: (op.font ?? undefined) === family ? '2px solid rgb(99,102,241)' : '2px solid transparent',
                  outlineOffset: '1px',
                  color: 'rgb(51,65,85)',
                }}
                onClick={() => onUpdate({ ...op, font: family })}
              >{label}</button>
            ))}
            <div className="w-px h-3 bg-slate-200 mx-0.5" />
            <button className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900 text-base leading-none" onClick={() => onUpdate({ ...op, fontSize: Math.max(6, op.fontSize - 1) })}>−</button>
            <span className="text-xs w-6 text-center font-mono text-slate-700">{op.fontSize}</span>
            <button className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900 text-base leading-none" onClick={() => onUpdate({ ...op, fontSize: Math.min(72, op.fontSize + 1) })}>+</button>
            <div className="w-px h-3 bg-slate-200 mx-0.5" />
            {COLORS.map(({ label, rgb }) => (
              <button
                key={label}
                title={label}
                className="w-4 h-4 rounded-full hover:scale-110 transition-transform"
                style={{
                  backgroundColor: `rgb(${rgb.map((c) => Math.round(c * 255)).join(',')})`,
                  outline: op.color.every((c, i) => Math.abs(c - rgb[i]) < 0.01) ? '2px solid rgb(99,102,241)' : '2px solid transparent',
                  outlineOffset: '2px',
                }}
                onClick={() => onUpdate({ ...op, color: rgb })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type HighlightAnnotProps = {
  op: Extract<EditOp, { type: 'highlight' }>;
  dims: PageDimensions;
};

function HighlightAnnot({ op, dims }: Readonly<HighlightAnnotProps>) {
  const qp = op.quadPoints;
  if (qp.length < 8) return null;

  const rects: Array<{ left: number; top: number; width: number; height: number }> = [];
  for (let i = 0; i + 7 < qp.length; i += 8) {
    const xs = [qp[i], qp[i + 2], qp[i + 4], qp[i + 6]];
    const ys = [qp[i + 1], qp[i + 3], qp[i + 5], qp[i + 7]];
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    rects.push(pdfToCss(minX, minY, maxX - minX, maxY - minY, dims));
  }

  return (
    <>
      {rects.map((r) => (
        <div
          key={`${r.left}-${r.top}-${r.width}-${r.height}`}
          className="absolute bg-yellow-300 opacity-50 pointer-events-none"
          style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
        />
      ))}
    </>
  );
}

type TextOverlayAnnotProps = {
  op: Extract<EditOp, { type: 'text_overlay' }>;
  dims: PageDimensions;
  onUpdate: (op: EditOp) => void;
};

function TextOverlayAnnot({ op, dims, onUpdate }: Readonly<TextOverlayAnnotProps>) {
  const [cx, cy, cw, ch] = op.coverRect;
  const pos = pdfToCss(cx, cy, cw, ch, dims);
  return (
    <div
      className="absolute pointer-events-auto bg-white border border-slate-300 rounded"
      style={{ left: pos.left, top: pos.top, width: pos.width, height: pos.height }}
    >
      <input
        className="w-full h-full bg-transparent text-slate-900 px-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
        style={{ fontSize: op.fontSize }}
        value={op.text}
        onChange={(e) => onUpdate({ ...op, text: e.target.value })}
      />
    </div>
  );
}

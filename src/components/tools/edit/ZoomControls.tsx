import Button from '@/components/ui/Button';
import { ZoomIn, ZoomOut, Undo2, Redo2, Maximize2, Minimize2 } from 'lucide-react';

const LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

type ZoomControlsProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
};

export default function ZoomControls({
  zoom, onZoomChange, canUndo, canRedo, onUndo, onRedo, isFullscreen, onFullscreenToggle,
}: Readonly<ZoomControlsProps>) {
  const canOut = zoom > LEVELS[0] + 0.01;
  const canIn = zoom < LEVELS[LEVELS.length - 1] - 0.01;

  const zoomOut = () => {
    const next = [...LEVELS].reverse().find((l) => l < zoom - 0.01);
    if (next !== undefined) onZoomChange(next);
  };

  const zoomIn = () => {
    const next = LEVELS.find((l) => l > zoom + 0.01);
    if (next !== undefined) onZoomChange(next);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo} title="Annuler (Cmd+Z)">
        <Undo2 size={16} strokeWidth={2} />
      </Button>

      <div className="w-px h-5 bg-slate-200" />

      <Button variant="outline" size="sm" onClick={zoomOut} disabled={!canOut}>
        <ZoomOut size={16} strokeWidth={2} />
      </Button>
      <span className="text-sm font-bold text-slate-700 w-12 text-center tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <Button variant="outline" size="sm" onClick={zoomIn} disabled={!canIn}>
        <ZoomIn size={16} strokeWidth={2} />
      </Button>

      <div className="w-px h-5 bg-slate-200" />

      <Button variant="outline" size="sm" onClick={onRedo} disabled={!canRedo} title="Rétablir (Cmd+Shift+Z)">
        <Redo2 size={16} strokeWidth={2} />
      </Button>

      {onFullscreenToggle && (
        <>
          <div className="w-px h-5 bg-slate-200" />
          <Button variant="outline" size="sm" onClick={onFullscreenToggle} title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}>
            {isFullscreen ? <Minimize2 size={16} strokeWidth={2} /> : <Maximize2 size={16} strokeWidth={2} />}
          </Button>
        </>
      )}
    </div>
  );
}

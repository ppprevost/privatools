import { useState, useRef, useCallback, type DragEvent } from 'react';
import { Upload, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

interface DropZoneProps {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

export default function DropZone({ accept, multiple = false, onFiles, compact = false }: Readonly<DropZoneProps>) {
  const [isDragging, setIsDragging] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndEmit = useCallback((files: File[]) => {
    const oversized = files.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setSizeError(`File "${oversized.name}" exceeds the 200 MB limit.`);
      return;
    }
    setSizeError(null);
    onFiles(multiple ? files : [files[0]]);
  }, [onFiles, multiple]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) validateAndEmit(files);
    },
    [validateAndEmit]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) validateAndEmit(files);
      e.target.value = '';
    },
    [validateAndEmit]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        'relative cursor-pointer overflow-hidden bg-white rounded-[var(--radius-card)] border-[4px] border-dashed border-slate-900 shadow-[var(--shadow-brutalist-lg)] transition-all duration-300 ease-out group',
        compact ? 'p-8 md:p-12' : 'p-12 md:p-16 lg:p-20',
        isDragging
          ? 'bg-indigo-50 border-indigo-600 scale-[1.02]'
          : 'hover:shadow-[14px_14px_0px_0px_rgba(99,102,241,1)]'
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
      />
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        <div
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center transition-transform duration-500',
            isDragging ? 'bg-indigo-600 rotate-12' : 'bg-indigo-500 group-hover:rotate-12'
          )}
        >
          <Upload size={40} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
            Drop your files here
          </h3>
          <p className="text-base text-slate-500 font-medium">
            or click to browse
          </p>
        </div>
        <button
          type="button"
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-base font-bold hover:bg-indigo-600 transition-colors shadow-lg flex items-center gap-2 group/btn"
        >
          Browse
          <MousePointer2 size={18} className="group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
      {sizeError && (
        <p className="text-sm text-rose-600 font-bold text-center mt-4">{sizeError}</p>
      )}
      <div
        className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#000 2px, transparent 2px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}

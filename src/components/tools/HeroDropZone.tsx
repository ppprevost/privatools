import { useState, useRef, useCallback, type DragEvent } from 'react';
import { Upload, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import HandDrawnIcon from '@/components/decorative/HandDrawnIcon';

const fileTypeRoutes: Record<string, string> = {
  'application/pdf': '/compress-pdf',
  'image/jpeg': '/compress-image',
  'image/png': '/compress-image',
  'image/webp': '/compress-image',
  'image/heic': '/convert-to-jpg',
};

export default function HeroDropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const routeFile = useCallback((file: File) => {
    const route = fileTypeRoutes[file.type] ?? '/compress-pdf';
    const url = new URL(route, window.location.origin);
    url.searchParams.set('autoload', '1');

    sessionStorage.setItem('privatools_pending_file', file.name);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    sessionStorage.setItem('privatools_pending_files_count', '1');

    window.location.href = url.toString();
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) routeFile(file);
    },
    [routeFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) routeFile(file);
    },
    [routeFile]
  );

  return (
    <div className="relative w-full max-w-4xl group">
      <div className="absolute top-1/2 -translate-y-1/2 -left-4 xl:-left-24 hidden lg:block">
        <HandDrawnIcon type="pdf" />
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 -right-4 xl:-right-24 hidden lg:block">
        <HandDrawnIcon type="img" />
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative z-10 cursor-pointer overflow-hidden bg-white rounded-[2.5rem] p-12 md:p-16 lg:p-20 border-[4px] border-dashed border-slate-900 shadow-[10px_10px_0px_0px_rgba(99,102,241,1)] transition-all duration-300 ease-out',
          isDragging
            ? 'bg-indigo-50 border-indigo-600 scale-[1.02]'
            : 'hover:shadow-[14px_14px_0px_0px_rgba(99,102,241,1)]'
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
          onChange={handleChange}
        />
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          <div
            className={cn(
              'w-24 h-24 rounded-full flex items-center justify-center transition-transform duration-500',
              isDragging ? 'bg-indigo-600 rotate-12' : 'bg-indigo-500 group-hover:rotate-12'
            )}
          >
            <Upload size={48} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              Drop your files here
            </h3>
            <p className="text-lg text-slate-500 font-medium">PDF, JPG, PNG, WebP or HEIC</p>
          </div>
          <button
            type="button"
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-lg font-bold hover:bg-indigo-600 transition-colors shadow-lg flex items-center gap-3 group/btn"
          >
            Browse
            <MousePointer2
              size={20}
              className="group-hover/btn:translate-x-1 transition-transform"
            />
          </button>
        </div>
        <div
          className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#000 2px, transparent 2px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>
    </div>
  );
}

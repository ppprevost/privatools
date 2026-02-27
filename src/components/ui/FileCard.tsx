import { FileText, Image as ImageIcon, X } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';

interface FileCardProps {
  file: File;
  onRemove?: () => void;
  resultSize?: number;
  className?: string;
}

export default function FileCard({ file, onRemove, resultSize, className }: FileCardProps) {
  const isPdf = file.type === 'application/pdf';
  const compressionPercent =
    resultSize !== undefined && file.size > 0
      ? Math.round(((file.size - resultSize) / file.size) * 100)
      : null;

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border-[3px] border-slate-900 shadow-[var(--shadow-brutalist-sm)]',
        className
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
          isPdf ? 'bg-rose-100' : 'bg-cyan-100'
        )}
      >
        {isPdf ? (
          <FileText size={24} className="text-rose-500" />
        ) : (
          <ImageIcon size={24} className="text-cyan-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 truncate">{file.name}</p>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{formatFileSize(file.size)}</span>
          {resultSize !== undefined && (
            <>
              <span>→</span>
              <span className="font-bold text-emerald-600">{formatFileSize(resultSize)}</span>
              {compressionPercent !== null && compressionPercent > 0 && (
                <span className="text-emerald-600 font-bold">(-{compressionPercent}%)</span>
              )}
            </>
          )}
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Remove file"
        >
          <X size={18} className="text-slate-400" />
        </button>
      )}
    </div>
  );
}

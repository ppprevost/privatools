import { FileText, Image as ImageIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HandDrawnIconProps {
  type: 'pdf' | 'img';
}

export default function HandDrawnIcon({ type }: Readonly<HandDrawnIconProps>) {
  return (
    <div
      className={cn(
        'relative w-16 h-20 flex items-center justify-center rounded-xl border-[3px] border-slate-900 shadow-[var(--shadow-brutalist-md)]',
        type === 'pdf' ? 'bg-rose-400 rotate-[-6deg]' : 'bg-cyan-400 rotate-[6deg]'
      )}
    >
      {type === 'pdf' ? (
        <FileText size={28} className="text-slate-900" strokeWidth={2.5} />
      ) : (
        <ImageIcon size={28} className="text-slate-900" strokeWidth={2.5} />
      )}
      <div className="absolute -top-3 -right-3 bg-white border-2 border-slate-900 rounded-full p-1">
        <Sparkles size={16} className="text-amber-500" fill="currentColor" />
      </div>
    </div>
  );
}

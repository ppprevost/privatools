import { useRef } from 'react';
import {
  FileDown, Combine, Scissors, FileImage, ImageDown,
  Scaling, FileType, Crop, Eraser, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolConfig } from '@/lib/tools-config';

const iconMap: Record<string, LucideIcon> = {
  FileDown, Combine, Scissors, FileImage, ImageDown,
  Scaling, FileType, Crop, Eraser,
};

const categoryColors: Record<string, { bg: string; border: string; shadow: string }> = {
  pdf: {
    bg: 'bg-rose-50 hover:bg-rose-100',
    border: 'border-rose-300',
    shadow: 'shadow-[4px_4px_0px_0px_rgba(244,63,94,0.4)]',
  },
  image: {
    bg: 'bg-cyan-50 hover:bg-cyan-100',
    border: 'border-cyan-300',
    shadow: 'shadow-[4px_4px_0px_0px_rgba(6,182,212,0.4)]',
  },
};

interface ToolCardProps {
  tool: ToolConfig;
}

export default function ToolCard({ tool }: Readonly<ToolCardProps>) {
  const Icon = iconMap[tool.icon] ?? FileDown;
  const colors = categoryColors[tool.category];
  const preloaded = useRef(false);

  const handleMouseEnter = () => {
    if (tool.slug !== 'remove-background' || preloaded.current) return;
    preloaded.current = true;
    import('@imgly/background-removal').then((m) => m.preload());
  };

  return (
    <a
      href={`/${tool.slug}`}
      onMouseEnter={handleMouseEnter}
      className={cn(
        'block p-6 rounded-2xl border-[3px] border-slate-900 transition-all duration-200 hover:-translate-y-1',
        colors.bg,
        colors.shadow
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[var(--shadow-brutalist-sm)]">
          <Icon size={24} className="text-slate-900" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg">{tool.name}</h3>
          <p className="text-sm text-slate-600 mt-1">{tool.description}</p>
        </div>
      </div>
    </a>
  );
}

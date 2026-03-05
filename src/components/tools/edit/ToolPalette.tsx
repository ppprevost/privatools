import { MousePointer2, Hand, Type, Highlighter, PenLine, ClipboardList } from 'lucide-react';
import type { ActiveTool } from '@/lib/pdf/edit-types';

type ToolPaletteProps = {
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
  hasFormFields: boolean;
  compact?: boolean;
};

type ToolBtn = { id: ActiveTool; icon: React.ReactNode; label: string };

export default function ToolPalette({ activeTool, onToolChange, hasFormFields, compact }: Readonly<ToolPaletteProps>) {
  const tools: ToolBtn[] = [
    { id: 'cursor', icon: <MousePointer2 size={18} strokeWidth={2} />, label: 'Select' },
    { id: 'scroll', icon: <Hand size={18} strokeWidth={2} />, label: 'Scroll' },
    { id: 'text-box', icon: <Type size={18} strokeWidth={2} />, label: 'Text Box' },
    { id: 'highlight', icon: <Highlighter size={18} strokeWidth={2} />, label: 'Highlight' },
    { id: 'edit-text', icon: <PenLine size={18} strokeWidth={2} />, label: 'Edit Text' },
    { id: 'form', icon: <ClipboardList size={18} strokeWidth={2} />, label: 'Form' },
  ];

  return (
    <div className={`flex gap-1.5 ${compact ? '' : 'flex-wrap justify-center gap-2'}`}>
      {tools.map(({ id, icon, label }) => {
        const isActive = activeTool === id;
        const isDisabled = id === 'form' && !hasFormFields;
        return (
          <button
            key={id}
            onClick={() => !isDisabled && onToolChange(id)}
            disabled={isDisabled}
            title={compact ? label : undefined}
            className={[
              'flex items-center rounded-lg border-2 font-semibold transition-colors',
              compact ? 'p-2' : 'gap-1.5 px-3 py-2 text-sm',
              isActive
                ? 'bg-indigo-50 border-slate-900 text-slate-900'
                : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900 bg-white',
              isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {icon}
            {!compact && label}
          </button>
        );
      })}
    </div>
  );
}

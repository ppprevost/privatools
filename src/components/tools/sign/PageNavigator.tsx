import { ChevronLeft, ChevronRight } from 'lucide-react';

type PageNavigatorProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function PageNavigator({ currentPage, totalPages, onPageChange }: Readonly<PageNavigatorProps>) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 0}
        className="p-2 rounded-xl border-[2px] border-slate-900 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="text-sm font-bold text-slate-700">
        Page {currentPage + 1} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        className="p-2 rounded-xl border-[2px] border-slate-900 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

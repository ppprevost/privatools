import Button from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type PageNavigatorProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function PageNavigator({ currentPage, totalPages, onPageChange }: Readonly<PageNavigatorProps>) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 0}
      >
        <ChevronLeft size={20} strokeWidth={2.5} />
      </Button>
      <span className="text-sm font-bold text-slate-700">
        Page {currentPage + 1} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
      >
        <ChevronRight size={20} strokeWidth={2.5} />
      </Button>
    </div>
  );
}

import * as Progress from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
}

export default function ProgressBar({ value, className }: Readonly<ProgressBarProps>) {
  return (
    <Progress.Root
      className={cn(
        'relative overflow-hidden bg-slate-100 rounded-full w-full h-4 border-2 border-slate-900',
        className
      )}
      value={value}
    >
      <Progress.Indicator
        className="bg-indigo-500 h-full rounded-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </Progress.Root>
  );
}

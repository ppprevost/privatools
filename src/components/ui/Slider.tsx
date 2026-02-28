import * as RadixSlider from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  className?: string;
}

export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  className,
}: Readonly<SliderProps>) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-700">{label}</label>
        <span className="text-sm font-bold text-indigo-600">
          {value}{unit}
        </span>
      </div>
      <RadixSlider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      >
        <RadixSlider.Track className="bg-slate-200 relative grow rounded-full h-2 border border-slate-300">
          <RadixSlider.Range className="absolute bg-indigo-500 rounded-full h-full" />
        </RadixSlider.Track>
        <RadixSlider.Thumb className="block w-5 h-5 bg-white border-[3px] border-slate-900 rounded-full shadow-[var(--shadow-brutalist-sm)] hover:bg-indigo-50 focus:outline-none cursor-grab active:cursor-grabbing" />
      </RadixSlider.Root>
    </div>
  );
}

import type { ReactNode } from 'react';

type AlertBannerProps = {
  color: 'emerald' | 'rose' | 'amber';
  icon: ReactNode;
  children: ReactNode;
  centered?: boolean;
};

const colorClasses: Record<string, { container: string; text: string }> = {
  emerald: { container: 'bg-emerald-50 border-slate-900', text: 'text-emerald-800' },
  rose: { container: 'bg-rose-50 border-slate-900', text: 'text-rose-800' },
  amber: { container: 'bg-amber-50 border-slate-900', text: 'text-amber-800' },
};

export default function AlertBanner({ color, icon, children, centered }: Readonly<AlertBannerProps>) {
  const classes = colorClasses[color];
  return (
    <div className={`flex items-center ${centered ? 'justify-center' : ''} gap-3 px-4 py-3 ${classes.container} rounded-xl border-[3px]`}>
      {icon}
      <p className={`text-sm font-bold ${classes.text}`}>{children}</p>
    </div>
  );
}

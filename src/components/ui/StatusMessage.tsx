import type { ReactNode } from 'react';
import Spinner from './Spinner';

type StatusMessageProps = {
  variant: 'error' | 'info' | 'loading';
  children: ReactNode;
};

const variantClasses: Record<string, string> = {
  error: 'text-sm text-rose-600 font-bold text-center',
  info: 'text-sm text-indigo-600 font-bold text-center',
};

export default function StatusMessage({ variant, children }: Readonly<StatusMessageProps>) {
  if (variant === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
        <Spinner size={16} className="text-indigo-500" />
        <span>{children}</span>
      </div>
    );
  }
  return <p className={variantClasses[variant]}>{children}</p>;
}

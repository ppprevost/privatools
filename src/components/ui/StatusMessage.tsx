import type { ReactNode } from 'react';

type StatusMessageProps = {
  variant: 'error' | 'info' | 'loading';
  children: ReactNode;
};

const variantClasses: Record<string, string> = {
  error: 'text-sm text-rose-600 font-bold text-center',
  info: 'text-sm text-indigo-600 font-bold text-center',
  loading: 'text-sm text-slate-500 text-center font-medium',
};

export default function StatusMessage({ variant, children }: Readonly<StatusMessageProps>) {
  return <p className={variantClasses[variant]}>{children}</p>;
}

import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-slate-900 text-white hover:bg-indigo-600 shadow-[var(--shadow-brutalist-sm)]',
  secondary: 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-[var(--shadow-brutalist-sm)]',
  outline: 'bg-white text-slate-900 border-[3px] border-slate-900 hover:bg-slate-50 shadow-[var(--shadow-brutalist-sm)]',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: Readonly<ButtonProps>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold rounded-[var(--radius-button)] border-[3px] border-slate-900 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

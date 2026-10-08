import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  /** Icon shown after the label (e.g. an arrow on primary calls to action). */
  trailingIcon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-gradient text-white shadow-cta hover:-translate-y-px hover:shadow-cta-hover',
  secondary: 'border border-line bg-surface text-fg shadow-hairline hover:border-line-strong hover:bg-surface-2',
  outline: 'border border-brand-200 bg-brand-50/60 text-brand-700 hover:border-brand-300 hover:bg-brand-50',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-6 text-[15px] gap-2 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  icon,
  trailingIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'group/button inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 select-none',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {loading && loadingText ? loadingText : children}
      {!loading && trailingIcon && <span className="transition-transform duration-200 group-hover/button:translate-x-0.5">{trailingIcon}</span>}
    </button>
  );
}

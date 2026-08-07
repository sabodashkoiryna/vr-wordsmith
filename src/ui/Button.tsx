import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-mono tracking-[0.04em] rounded-full ' +
  'cursor-pointer whitespace-nowrap no-underline transition-[filter,background-color,border-color,transform] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  // Головна дія — градієнт аврори: єдиний елемент такої яскравості на екрані.
  primary: 'text-white border-2 border-transparent hover:brightness-115 active:scale-[0.98]',
  ghost:
    'text-ink border-2 border-[var(--line-strong)] bg-transparent hover:bg-space-600 active:scale-[0.98]',
  subtle: 'text-ink-soft border-2 border-transparent bg-space-700 hover:bg-space-600',
};

const sizes: Record<Size, string> = {
  sm: 'text-2xs px-4 py-2',
  md: 'text-xs px-6 py-3',
  lg: 'text-sm px-8 py-4',
};

export default function Button<T extends ElementType = 'button'>({
  as,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: {
  as?: T;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>) {
  const Tag = (as ?? 'button') as ElementType;
  return (
    <Tag
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      style={variant === 'primary' ? { background: 'var(--grad-aurora)' } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

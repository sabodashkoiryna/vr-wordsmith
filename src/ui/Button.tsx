import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

/*
 * Контур робимо внутрішньою тінню, а не border.
 * Причина: у primary фон — градієнт, а прозора рамка малювалася поверх нього
 * (background-clip за замовчуванням — border-box). На заокругленнях радіуси
 * зовнішнього та внутрішнього країв не збігаються, і по кутах з'являлася
 * світла облямівка. inset box-shadow не входить у модель коробки взагалі,
 * тож артефакт зникає, а всі варіанти лишаються однакового розміру.
 */
const base =
  'inline-flex items-center justify-center gap-2 font-mono tracking-[0.04em] rounded-full ' +
  'border-0 cursor-pointer whitespace-nowrap no-underline ' +
  'transition-[filter,background-color,box-shadow,transform] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary: 'text-white hover:brightness-115 active:scale-[0.98]',
  ghost:
    'text-ink bg-transparent shadow-[inset_0_0_0_2px_var(--line-strong)] ' +
    'hover:bg-space-600 hover:shadow-[inset_0_0_0_2px_var(--line-glow)] active:scale-[0.98]',
  subtle: 'text-ink-soft bg-space-700 hover:bg-space-600',
};

const sizes: Record<Size, string> = {
  sm: 'text-2xs px-4 py-2.5',
  md: 'text-xs px-6 py-3.5',
  lg: 'text-sm px-8 py-4.5',
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

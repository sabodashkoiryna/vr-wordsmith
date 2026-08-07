import type { ElementType, ReactNode } from 'react';
import { useReveal } from './hooks';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

/**
 * Показ блоку при скролі. Сам компонент лише вішає data-атрибути —
 * перехід описаний у motion.css, тож анімація йде на композиторі
 * і не змушує React перемальовуватись.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  direction = 'up',
  delay = 0,
  once = true,
  className = '',
  ...rest
}: {
  children: ReactNode;
  as?: ElementType;
  direction?: Direction;
  /** Затримка в кроках --stagger, не в мілісекундах — щоб reduced-motion обнуляв її разом з рештою. */
  delay?: number;
  once?: boolean;
  className?: string;
} & Record<string, unknown>) {
  const ref = useReveal<HTMLElement>(once);
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      data-reveal-dir={direction}
      style={delay ? ({ '--reveal-delay': delay } as React.CSSProperties) : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Каскад: діти з'являються одна за одною. Кожній дитині проставляється --i,
 * а CSS перетворює його на transition-delay.
 */
export function Stagger({
  children,
  as: Tag = 'div',
  direction = 'up',
  className = '',
  ...rest
}: {
  children: ReactNode[];
  as?: ElementType;
  direction?: Direction;
  className?: string;
} & Record<string, unknown>) {
  return (
    <Tag className={className} {...rest}>
      {children.map((child, i) => (
        <Reveal key={i} direction={direction} delay={i}>
          {child}
        </Reveal>
      ))}
    </Tag>
  );
}

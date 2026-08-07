import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Спільна оболонка екранів автентифікації: центрована скляна картка на тлі
 * того самого світіння, що й на лендінгу, — щоб вхід не виглядав як інший
 * продукт. Ліворуч на широких екранах — коротке нагадування, що дає курс:
 * форма реєстрації без контексту конвертує гірше.
 */
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-[calc(100vh-63px)] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-32 h-[560px]"
        style={{ background: 'var(--grad-glow-radial)' }}
      />

      <div className="container-content relative grid items-center gap-16 py-16 lg:grid-cols-[1fr_minmax(380px,440px)] lg:py-24">
        {/* Ліва колонка — цінність. На мобільному ховається, щоб форма була одразу. */}
        <div className="hidden lg:block">
          <p className="eyebrow mb-5">Безкоштовно · сертифікат</p>
          <h2 className="max-w-lg text-3xl">
            Від першого занурення — до <span className="text-gradient">власного VR-уроку</span>
          </h2>
          <ul className="mt-8 flex max-w-md flex-col gap-4">
            {[
              ['60 годин', '5 модулів: лекції, тести з автоперевіркою і практика'],
              ['100 балів', 'сертифікат від 60, з публічним кодом верифікації'],
              ['Без обладнання', 'достатньо смартфона й картонних окулярів'],
            ].map(([label, text]) => (
              <li key={label} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: 'var(--grad-aurora)' }}
                />
                <span>
                  <span className="block font-display text-md text-ink">{label}</span>
                  <span className="block text-sm text-ink-mute">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Права колонка — сама форма. */}
        <div className="glass mx-auto w-full max-w-md rounded-[var(--radius-xl)] p-8 md:p-10">
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h1 className="text-2xl">{title}</h1>
          {subtitle && <p className="mt-3 text-md leading-relaxed text-ink-soft">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && (
            <div className="mt-7 border-t border-[var(--line)] pt-5 text-sm text-ink-mute">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Посилання всередині підвалу форми. */
export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-violet-300 underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

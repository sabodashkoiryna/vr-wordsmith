import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/* ===========================================================================
   Примітиви адмінки.

   Окремо від ui/ застосунку навмисно: тут інші пріоритети. Публічні екрани
   оптимізовані під перше враження, адмінські — під годину роботи поспіль,
   тож щільність, клавіатура й передбачуваність важливіші за ефект.
   ======================================================================== */

export function PageHeader({
  title,
  description,
  count,
  actions,
}: {
  title: string;
  description?: ReactNode;
  count?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl text-ink">{title}</h1>
          {count && (
            <span className="rounded-full bg-space-700 px-2.5 py-1 font-mono text-2xs text-ink-mute">
              {count}
            </span>
          )}
        </div>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-3">{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Пошук…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-space-900/60 px-4 py-2.5 text-sm text-ink placeholder:text-ink-dim focus:border-cyan-400 focus:outline-none"
      />
    </div>
  );
}

export function AdminButton({
  children,
  onClick,
  variant = 'ghost',
  disabled,
  type = 'button',
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
}) {
  const styles = {
    primary: 'bg-violet-500 text-white hover:brightness-115',
    ghost: 'bg-space-700 text-ink hover:bg-space-600',
    danger: 'bg-transparent text-danger hover:bg-space-700',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`cursor-pointer rounded-[var(--radius-sm)] border-none px-4 py-2.5 font-mono text-2xs tracking-[0.04em] whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

export function Banner({ tone, children }: { tone: 'error' | 'success' | 'warning'; children: ReactNode }) {
  const styles = {
    error: 'text-danger',
    success: 'text-success',
    warning: 'text-warning',
  }[tone];
  return (
    <p role="status" className={`mb-4 rounded-[var(--radius-sm)] bg-space-700 p-3.5 text-sm ${styles}`}>
      {children}
    </p>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line-strong)] p-10 text-center">
      <p className="text-ink">{title}</p>
      {hint && <p className="mt-2 text-sm text-ink-mute">{hint}</p>}
    </div>
  );
}

/**
 * Бічна панель редагування.
 *
 * Збоку, а не під таблицею: редагуючи урок, треба бачити, у якому ти списку,
 * і не гортати сторінку щоразу вгору-вниз. Esc закриває, але тільки коли
 * нема незбережених змін — інакше спитає.
 */
export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Фокус у панель, щоб клавіатура працювала одразу, без зайвого кліку.
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal,100)] flex justify-end">
      <div
        className="absolute inset-0 bg-void/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex h-full w-full flex-col bg-space-800 shadow-[var(--shadow-3)] outline-none ${
          wide ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
          <h2 className="truncate text-lg text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="cursor-pointer rounded-[var(--radius-sm)] border-none bg-transparent px-3 py-2 font-mono text-2xs text-ink-mute hover:bg-space-700 hover:text-ink"
          >
            ESC ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

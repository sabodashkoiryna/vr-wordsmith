import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';

/**
 * Поле форми з підписом, підказкою та помилкою, коректно зв'язаними через
 * aria-describedby — інакше скрінрідер прочитає лише сам інпут.
 */
export default function Field({
  label,
  hint,
  error,
  ...input
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-mono text-2xs tracking-widest text-ink-mute">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-[var(--radius-sm)] border bg-space-900/60 px-4 py-3 text-md text-ink transition-colors placeholder:text-ink-dim ${
          error ? 'border-[var(--color-danger)]' : 'border-[var(--line-strong)] focus:border-cyan-400'
        }`}
        {...input}
      />
      {hint && (
        <p id={hintId} className="text-sm text-ink-mute">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

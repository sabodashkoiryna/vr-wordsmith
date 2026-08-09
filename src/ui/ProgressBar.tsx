/**
 * Смуга прогресу. `value`/`max` — у тих самих одиницях, що й підпис поруч,
 * щоб озвучувач читав те саме число, що бачить зряча людина.
 */
export default function ProgressBar({
  value,
  max,
  label,
  tone = 'violet',
  className = '',
}: {
  value: number;
  max: number;
  label: string;
  tone?: 'violet' | 'cyan' | 'gold';
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const fill = {
    violet: 'var(--grad-aurora)',
    cyan: 'var(--color-cyan-400)',
    gold: 'var(--color-gold)',
  }[tone];

  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-space-600 ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width] duration-[var(--dur-slow)]"
        style={{ width: `${pct}%`, background: fill }}
      />
    </div>
  );
}

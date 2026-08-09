import { useId } from 'react';
import { useCountUp } from './motion/useCountUp';

/**
 * Кільце прогресу.
 *
 * Дуга і число рухаються з одного значення, тож не можуть розійтися — а це
 * найпомітніший дефект таких віджетів: підпис уже показує підсумок, поки дуга
 * ще повзе. Під prefers-reduced-motion useCountUp віддає ціль одразу, і
 * кільце просто малюється у фінальному стані.
 */
export default function ProgressRing({
  value,
  max,
  label,
  caption,
  size = 132,
  stroke = 9,
}: {
  value: number;
  max: number;
  label: string;
  caption?: string;
  size?: number;
  stroke?: number;
}) {
  // id градієнта мусить бути унікальним: два кільця на сторінці дали б два
  // <linearGradient> з однаковим id, і другий тихо перебив би перший.
  const gradientId = useId();
  const animated = useCountUp(value);
  const pct = max > 0 ? Math.min(1, animated / max) : 0;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(value)} з ${max}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-violet-500)" />
            <stop offset="45%" stopColor="var(--color-violet-400)" />
            <stop offset="100%" stopColor="var(--color-cyan-400)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-space-600)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>

      <div className="absolute grid place-items-center text-center">
        <span className="font-display text-2xl leading-none text-ink">
          {Math.round(animated)}
          <span className="text-ink-mute">/{max}</span>
        </span>
        {caption && <span className="mt-1.5 font-mono text-2xs text-ink-mute">{caption}</span>}
      </div>
    </div>
  );
}

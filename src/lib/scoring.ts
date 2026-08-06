export type Level = 'low' | 'mid' | 'high';

export const LEVEL_LABEL: Record<Level, string> = {
  low: 'Низький (репродуктивний)',
  mid: 'Середній (конструктивний)',
  high: 'Високий (творчий)',
};

export function levelFromSum(sum: number, bounds: [number, number]): Level {
  if (sum <= bounds[0]) return 'low';
  if (sum <= bounds[1]) return 'mid';
  return 'high';
}

export function levelFromPct(pct: number): Level {
  if (pct <= 60) return 'low';
  if (pct <= 85) return 'mid';
  return 'high';
}

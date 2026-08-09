import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './hooks';

/**
 * Плавний відлік числа до цільового значення.
 *
 * Потрібен саме тут, а не в CSS: анімувати можна лише властивості, а це
 * текстовий вміст. Тому єдиний випадок у проєкті, де анімація живе в JS.
 *
 * Під prefers-reduced-motion повертає ціль одразу — і не заводить rAF взагалі,
 * а не просто скорочує тривалість: кадри, яких не існує, не коштують нічого.
 * Змінилася ціль (склали тест, зарахували бал) — відлік іде від поточного
 * показаного значення, а не з нуля: інакше набрані бали щоразу «обнулялися б»
 * на очах.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) return;

    let raf = 0;
    const start = performance.now();
    // easeOutCubic: швидкий старт і м'яка зупинка — число встигає прочитатися,
    // поки ще рухається, і не «клацає» в кінці.
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const next = from + (target - from) * ease(t);
      fromRef.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reduced]);

  return value;
}

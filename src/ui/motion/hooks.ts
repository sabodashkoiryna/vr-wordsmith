import { useEffect, useRef, useState } from 'react';

/**
 * Чи просив користувач зменшити анімацію. На відміну від PoC (де перевірка
 * робилась один раз на рівні модуля) — слухаємо зміни: користувач може
 * увімкнути режим під час сесії.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/* --------------------------------------------------------------------------
   Scroll-reveal.
   Один спільний IntersectionObserver на всю сторінку замість окремого на
   кожен елемент — інакше на лендінгу з десятками блоків їх були б десятки.
   Елемент лише отримує data-revealed="true", решту (перехід) робить CSS.
   -------------------------------------------------------------------------- */

type RevealEntry = { once: boolean };
const revealTargets = new WeakMap<Element, RevealEntry>();
let sharedObserver: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  sharedObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cfg = revealTargets.get(entry.target);
        if (!cfg) continue;
        if (entry.isIntersecting) {
          entry.target.setAttribute('data-revealed', 'true');
          if (cfg.once) sharedObserver?.unobserve(entry.target);
        } else if (!cfg.once) {
          entry.target.removeAttribute('data-revealed');
        }
      }
    },
    // rootMargin знизу від'ємний, щоб блок «прокидався» трохи раніше, ніж
    // торкнеться нижнього краю екрана — інакше анімація помітно запізнюється.
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  return sharedObserver;
}

export function useReveal<T extends Element>(once = true) {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // За reduced-motion не ховаємо контент узагалі: показуємо одразу.
    if (reduced) {
      el.setAttribute('data-revealed', 'true');
      return;
    }
    revealTargets.set(el, { once });
    const obs = getObserver();
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      revealTargets.delete(el);
    };
  }, [once, reduced]);

  return ref;
}

/* --------------------------------------------------------------------------
   Паралакс від курсора.
   Хук лише пише на елемент дві змінні --px/--py у діапазоні -1..1 і плавно
   доводить їх до цілі (lerp). Далі все робить CSS: кожен шар оголошує власну
   «глибину» й рухається на свою величину. Такий поділ дає:
     • один rAF-цикл на весь герой замість анімації в React-стані;
     • нульову вартість під prefers-reduced-motion — там --parallax-strength
       дорівнює 0, тож усі calc() схлопуються самі.
   -------------------------------------------------------------------------- */
export function usePointerParallax<T extends HTMLElement>(smoothing = 0.12) {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    // На сенсорних екранах курсора немає — не вішаємо нічого.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;

    const tick = () => {
      curX += (targetX - curX) * smoothing;
      curY += (targetY - curY) * smoothing;
      el.style.setProperty('--px', curX.toFixed(4));
      el.style.setProperty('--py', curY.toFixed(4));
      const settled = Math.abs(targetX - curX) < 0.0005 && Math.abs(targetY - curY) < 0.0005;
      raf = settled ? 0 : requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width - 0.5) * 2;
      targetY = ((e.clientY - r.top) / r.height - 0.5) * 2;
      el.style.setProperty('--pointer-active', '1');
      kick();
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      el.style.setProperty('--pointer-active', '0');
      kick();
    };

    // Слухаємо на window, а не на елементі: портал має реагувати ще до того,
    // як курсор на нього наїде — так ефект «живий», а не вмикається ривком.
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [smoothing, reduced]);

  return ref;
}

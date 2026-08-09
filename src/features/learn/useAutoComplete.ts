import { useEffect, useRef } from 'react';

/**
 * Позначає урок пройденим, коли людина догортала до кінця тексту.
 *
 * Спостерігаємо за «маячком» — порожнім елементом одразу під контентом. Щойно
 * він потрапляє у видиму область, урок зараховано. Це чесніший показник, ніж
 * кнопка: натиснути її можна, не читаючи, а догорнути до низу без прокрутки
 * тексту не вийде.
 *
 * `enabled` вимикає спостереження для вже пройдених уроків і для тестів —
 * тест зараховується здачею, а не прокруткою.
 *
 * Спрацьовує рівно один раз на урок: `firedFor` тримає id, для якого вже
 * викликали, інакше кожен повторний перетин маячка (а їх при гортанні вгору-
 * вниз десятки) слав би запит на оновлення прогресу.
 */
export function useAutoComplete(
  lessonId: string | null,
  enabled: boolean,
  onReachedEnd: () => void,
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const firedFor = useRef<string | null>(null);
  // Тримаємо колбек у ref, щоб зміна його ідентичності не перезапускала
  // спостерігача на кожному рендері.
  const callbackRef = useRef(onReachedEnd);
  callbackRef.current = onReachedEnd;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !lessonId || !enabled) return;
    if (firedFor.current === lessonId) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (firedFor.current === lessonId) return;
          firedFor.current = lessonId;
          obs.disconnect();
          callbackRef.current();
        }
      },
      // Невеликий відступ знизу: маячок має саме зʼявитися в полі зору, а не
      // майнути на межі під час швидкого гортання.
      { rootMargin: '0px 0px -40px 0px' },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [lessonId, enabled]);

  return sentinelRef;
}

import { usePointerParallax } from '../../ui/motion/hooks';

/**
 * «Портал» у художній світ твору — центральний візуальний образ лендінгу.
 *
 * Реагує на курсор по всій сторінці (а не лише при наведенні на себе):
 * шари всередині рухаються з різною швидкістю, форма нахиляється в 3D,
 * а відблиск іде за вказівником. Вся математика — у hero.css через
 * дві змінні, які пише usePointerParallax.
 */
export default function HeroPortal({
  quote,
  source,
}: {
  quote: string;
  source: string;
}) {
  const ref = usePointerParallax<HTMLDivElement>();

  return (
    <div className="portal-stage" ref={ref}>
      <div className="portal-glow anim-aurora" aria-hidden="true" />
      {/* Декоративний: текст цитати продубльовано в доступному вигляді нижче. */}
      <div className="portal" aria-hidden="true">
        <div className="portal-layer portal-stars portal-stars-far anim-twinkle" />
        <div className="portal-layer portal-stars portal-stars-near" />

        <div className="ridge-l ridge-far" />
        <div className="ridge-l ridge-mid" />
        <div className="ridge-l ridge-near" />

        <figure className="portal-quote">
          <blockquote>{quote}</blockquote>
          <figcaption>{source}</figcaption>
        </figure>

        <div className="portal-layer portal-specular" />
        <div className="portal-layer portal-lens" />
      </div>
    </div>
  );
}

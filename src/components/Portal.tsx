import { useRef } from 'react';
import type { MouseEvent } from 'react';

const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Portal() {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!motionOK || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
  }

  function handleMouseLeave() {
    if (ref.current) ref.current.style.transform = '';
  }

  return (
    <div>
      <div
        className="portal"
        ref={ref}
        aria-hidden="true"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="stars" />
        <div className="ridge r3" />
        <div className="ridge r2" />
        <div className="ridge r1" />
        <figure>
          <blockquote>«Іван був дев'ятнадцятою дитиною в гуцульській родині Палійчуків…»</blockquote>
          <figcaption>М. КОЦЮБИНСЬКИЙ · ТІНІ ЗАБУТИХ ПРЕДКІВ · VR-МАНДРІВКА КАРПАТАМИ</figcaption>
        </figure>
        <div className="lens" />
      </div>
      <p className="hero-note">наведіть курсор — портал реагує на погляд</p>
    </div>
  );
}

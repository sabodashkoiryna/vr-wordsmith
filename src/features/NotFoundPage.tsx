import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { Reveal } from '../ui/motion/Reveal';

export default function NotFoundPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-[520px]"
        style={{ background: 'var(--grad-glow-radial)' }}
      />

      <section className="container-content relative pt-24 pb-28 text-center md:pt-32">
        <Reveal>
          <div className="font-mono text-2xs tracking-widest text-violet-300">404</div>
          <h1 className="mt-4 text-3xl md:text-4xl">Такої сторінки немає</h1>
          <p className="mx-auto mt-5 max-w-lg text-ink-soft">
            Можливо, посилання застаріле. Курс і галерея робіт — за посиланнями нижче.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button as={Link} to="/">
              На головну
            </Button>
            <Button as={Link} to="/gallery" variant="ghost">
              Галерея робіт
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

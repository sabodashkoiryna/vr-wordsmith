import { Link } from 'react-router-dom';

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-space-800/40">
      <div className="container-content py-14">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Link
              to="/"
              className="font-display text-[17px] font-extrabold tracking-[0.02em] text-ink no-underline"
            >
              VR-<span className="text-violet-400">Словесник</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-ink-mute">
              Безкоштовний онлайн-курс для вчителів української мови та літератури про доцільне
              застосування віртуальної реальності на уроці.
            </p>
          </div>

          <nav className="flex flex-col gap-2.5">
            <p className="font-mono text-2xs tracking-widest text-violet-300">КУРС</p>
            <a href="/#course" className="text-sm text-ink-soft no-underline hover:text-ink">
              Про курс
            </a>
            <a href="/#curriculum" className="text-sm text-ink-soft no-underline hover:text-ink">
              Програма
            </a>
            <a href="/#certificate" className="text-sm text-ink-soft no-underline hover:text-ink">
              Сертифікат
            </a>
            <a href="/#faq" className="text-sm text-ink-soft no-underline hover:text-ink">
              Питання
            </a>
          </nav>

          <nav className="flex flex-col gap-2.5">
            <p className="font-mono text-2xs tracking-widest text-violet-300">ПЛАТФОРМА</p>
            <Link to="/gallery" className="text-sm text-ink-soft no-underline hover:text-ink">
              Галерея робіт
            </Link>
            <Link to="/signup" className="text-sm text-ink-soft no-underline hover:text-ink">
              Реєстрація
            </Link>
            <Link to="/login" className="text-sm text-ink-soft no-underline hover:text-ink">
              Вхід
            </Link>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--line)] pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-2xs tracking-widest text-ink-mute">
            © {YEAR} VR-СЛОВЕСНИК
          </p>
          <p className="font-mono text-2xs tracking-widest text-ink-mute">
            НАЦІОНАЛЬНИЙ УНІВЕРСИТЕТ «ЛЬВІВСЬКА ПОЛІТЕХНІКА»
          </p>
        </div>
      </div>
    </footer>
  );
}

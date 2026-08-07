import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Односторінковий лендінг: навігація — це якорі в межах сторінки. */
const LANDING_ANCHORS = [
  { href: '#course', label: 'Про курс' },
  { href: '#curriculum', label: 'Програма' },
  { href: '#lecturer', label: 'Викладач' },
  { href: '#certificate', label: 'Сертифікат' },
  { href: '#faq', label: 'Питання' },
];

export default function Header() {
  const { userId, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  const onLanding = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <header
      className={`sticky top-0 z-[var(--z-header)] border-b transition-colors duration-[var(--dur-base)] ${
        scrolled ? 'glass border-[var(--line)]' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="container-content flex flex-wrap items-center gap-x-6 gap-y-3 py-3.5">
        <Link
          to="/"
          className="font-display text-[17px] font-extrabold tracking-[0.02em] whitespace-nowrap text-ink no-underline"
        >
          VR-<span className="text-violet-400">Словесник</span>
        </Link>

        <nav className="hidden flex-1 gap-1 md:flex">
          {onLanding
            ? LANDING_ANCHORS.map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  className="rounded-full px-3 py-2 font-mono text-2xs tracking-[0.04em] text-ink-soft no-underline transition-colors hover:bg-space-600 hover:text-ink"
                >
                  {a.label}
                </a>
              ))
            : null}
          <NavLink
            to="/gallery"
            className={({ isActive }) =>
              `rounded-full px-3 py-2 font-mono text-2xs tracking-[0.04em] no-underline transition-colors hover:bg-space-600 hover:text-ink ${
                isActive ? 'bg-violet-500 text-white' : 'text-ink-soft'
              }`
            }
          >
            Галерея
          </NavLink>
          {userId && (
            <NavLink
              to="/learn"
              className={({ isActive }) =>
                `rounded-full px-3 py-2 font-mono text-2xs tracking-[0.04em] no-underline transition-colors hover:bg-space-600 hover:text-ink ${
                  isActive ? 'bg-violet-500 text-white' : 'text-ink-soft'
                }`
              }
            >
              Мій курс
            </NavLink>
          )}
        </nav>

        <nav className="ml-auto flex items-center gap-1">
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `rounded-full px-3 py-2 font-mono text-2xs tracking-[0.04em] no-underline transition-colors hover:bg-space-600 hover:text-ink ${
                  isActive ? 'bg-violet-500 text-white' : 'text-ink-soft'
                }`
              }
            >
              Адмінка
            </NavLink>
          )}
          {userId ? (
            <button
              onClick={handleSignOut}
              className="cursor-pointer rounded-full border-none bg-transparent px-3 py-2 font-mono text-2xs tracking-[0.04em] text-ink-soft transition-colors hover:bg-space-600 hover:text-ink"
            >
              Вийти
            </button>
          ) : (
            <>
              <NavLink
                to="/login"
                className="rounded-full px-3 py-2 font-mono text-2xs tracking-[0.04em] text-ink-soft no-underline transition-colors hover:bg-space-600 hover:text-ink"
              >
                Вхід
              </NavLink>
              <Link
                to="/signup"
                className="rounded-full px-4 py-2 font-mono text-2xs tracking-[0.04em] text-white no-underline transition-[filter] hover:brightness-115"
                style={{ background: 'var(--grad-aurora)' }}
              >
                Почати
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

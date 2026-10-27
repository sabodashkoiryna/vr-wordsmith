import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Адмінка поділена на три частини, бо це три різні роботи з різною
 * періодичністю: контент правлять постійно, роботи оцінюють хвилями після
 * дедлайнів, сертифікати видають раз на набір. Плаский список із десяти
 * пунктів не показував цієї різниці й змушував щоразу шукати потрібне.
 */
const SECTIONS: { title: string; items: { to: string; label: string; end?: boolean }[] }[] = [
  {
    title: 'КОНТЕНТ',
    items: [
      { to: '/admin', label: 'Огляд', end: true },
      { to: '/admin/modules', label: 'Модулі' },
      { to: '/admin/lessons', label: 'Уроки' },
      { to: '/admin/resources', label: 'Ресурси' },
      { to: '/admin/gallery', label: 'Галерея' },
      { to: '/admin/diagnostics', label: 'Діагностика' },
    ],
  },
  {
    title: 'УЧАСНИКИ Й РОБОТИ',
    items: [
      { to: '/admin/participants', label: 'Учасники' },
      { to: '/admin/grading', label: 'Оцінювання' },
      { to: '/admin/users', label: 'Ролі' },
    ],
  },
  {
    title: 'СЕРТИФІКАТИ',
    items: [{ to: '/admin/certificates', label: 'Номери й видані' }],
  },
];

export default function AdminLayout() {
  const { email, signOut } = useAuth();

  return (
    <div className="container-wide grid gap-8 py-10 lg:grid-cols-[230px_1fr] lg:py-14">
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
        <div className="rounded-[var(--radius-lg)] bg-space-800 p-4">
          <div className="truncate font-mono text-2xs text-ink-mute">{email}</div>
          <button
            onClick={signOut}
            className="mt-2 cursor-pointer border-none bg-transparent p-0 font-mono text-2xs text-violet-300 hover:text-ink"
          >
            Вийти
          </button>
        </div>

        <nav className="mt-5 flex flex-col gap-6" aria-label="Розділи адмінки">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="px-3 font-mono text-2xs tracking-widest text-ink-mute">
                {section.title}
              </div>
              <ul className="mt-2 list-none p-0">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `block rounded-[var(--radius-sm)] px-3 py-2 text-sm no-underline transition-colors ${
                          isActive
                            ? 'bg-space-600 text-ink'
                            : 'text-ink-soft hover:bg-space-700 hover:text-ink'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

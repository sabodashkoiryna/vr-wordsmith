import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin', label: 'Огляд', end: true },
  { to: '/admin/modules', label: 'Модулі' },
  { to: '/admin/resources', label: 'Ресурси' },
  { to: '/admin/diagnostics', label: 'Діагностика' },
  { to: '/admin/users', label: 'Користувачі' },
];

export default function AdminLayout() {
  const { email, signOut } = useAuth();

  return (
    <section className="page">
      <div className="eyebrow">Адмін-панель</div>
      <h2>VR-Wordsmith · керування платформою</h2>
      <div className="admin-shell">
        <nav className="admin-nav">
          <div className="admin-user">
            {email}
            <div>
              <button className="btn ghost" style={{ marginTop: 8, padding: '6px 12px', fontSize: 11 }} onClick={signOut}>
                Вийти
              </button>
            </div>
          </div>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div>
          <Outlet />
        </div>
      </div>
    </section>
  );
}

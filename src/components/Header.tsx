import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Головна', end: true },
  { to: '/modules', label: 'Модулі' },
  { to: '/matrix', label: 'Матриця' },
  { to: '/diag', label: 'Діагностика' },
  { to: '/exp', label: 'Експеримент' },
  { to: '/res', label: 'Ресурси' },
];

export default function Header() {
  const { userId, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <header>
      <div className="hwrap">
        <NavLink className="logo" to="/">
          VR-<em>Словесник</em>
        </NavLink>
        <nav className="nav-main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <nav className="nav-auth">
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Адмінка
            </NavLink>
          )}
          {userId ? (
            <button onClick={handleSignOut}>Вийти</button>
          ) : (
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Вхід
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

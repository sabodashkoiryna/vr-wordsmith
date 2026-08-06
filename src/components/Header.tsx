import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Головна', end: true },
  { to: '/modules', label: 'Модулі' },
  { to: '/matrix', label: 'Матриця' },
  { to: '/diag', label: 'Діагностика' },
  { to: '/exp', label: 'Експеримент' },
  { to: '/res', label: 'Ресурси' },
  { to: '/login', label: 'Вхід' },
];

export default function Header() {
  return (
    <header>
      <div className="hwrap">
        <NavLink className="logo" to="/">
          VR-<em>Словесник</em>
        </NavLink>
        <nav>
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
      </div>
    </header>
  );
}

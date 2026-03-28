import { NavLink, useNavigate } from 'react-router-dom';

const NAV = [
  { to: '/',         label: 'Overview',  icon: '📊' },
  { to: '/events',   label: 'Share Log', icon: '🔗' },
  { to: '/settings', label: 'Settings',  icon: '⚙️'  },
  { to: '/api-keys', label: 'API Keys',  icon: '🔑' },
];

export default function Layout({ merchant, onLogout, children }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('authorizd_token');
    onLogout();
    navigate('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🎁 <span>Authorizd</span></div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-shop">{merchant?.shop_name}</div>
          <div className="sidebar-email">{merchant?.email}</div>
          <button className="btn-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

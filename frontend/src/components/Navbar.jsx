import { useAuth } from '../AuthContext';

const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 3v18h18M7 16l4-4 4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/>
  </svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round"/>
  </svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Navbar({ page, setPage }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin
    ? [{ key: 'admin', label: 'Foydalanuvchilar', icon: <IconUsers /> }]
    : [
        { key: 'dashboard', label: 'Tavsiyalar', icon: <IconChart /> },
        { key: 'profile', label: 'Profil', icon: <IconUser /> },
      ];

  return (
    <>
      <nav className="topbar">
        <a className="topbar-brand" href="/">
          <span className="topbar-brand-dot" />
          TavsiyaAI
        </a>
        <div className="topbar-right">
          {user && (
            <div className="topbar-user">
              <div className="topbar-avatar">{user.username[0].toUpperCase()}</div>
              <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{user.username}</span>
              {isAdmin && <span className="badge badge-amber">Admin</span>}
            </div>
          )}
        </div>
      </nav>

      {/* Sidebar is rendered separately, pass page/setPage as props */}
      <div style={{ display: 'none' }} data-nav-items={JSON.stringify(navItems)} />
    </>
  );
}

export { IconChart, IconUser, IconUsers, IconLogout };

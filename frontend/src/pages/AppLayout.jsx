import { useState } from 'react';
import { useAuth } from '../AuthContext';
import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import ChangePassword from './ChangePassword';

// SVG icons
const icons = {
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3v18h18M7 16l4-4 4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/>
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [page, setPage] = useState(isAdmin ? 'admin' : 'dashboard');
  const d = user?.demographics || {};

  const userNav = [
    { key: 'dashboard', label: 'Tavsiyalar',       icon: icons.chart },
    { key: 'profile',   label: 'Profil',            icon: icons.user  },
    { key: 'password',  label: 'Parolni yangilash', icon: icons.lock  },
  ];
  const adminNav = [
    { key: 'admin', label: 'Boshqaruv paneli', icon: icons.users },
  ];
  const navItems = isAdmin ? adminNav : userNav;

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Topbar */}
      <nav className="topbar">
        <a className="topbar-brand">
          <span className="topbar-brand-dot" />TavsiyaAI
        </a>
        <div className="topbar-right">
          <div className="topbar-user">
            <div className="topbar-avatar">{user?.username?.[0]?.toUpperCase()}</div>
            <span style={{ color: 'var(--text-1)', fontWeight: 500, fontSize: 13 }}>{user?.username}</span>
            {isAdmin && <span className="badge badge-amber" style={{ fontSize: 10 }}>Admin</span>}
          </div>
        </div>
      </nav>

      {/* Shell */}
      <div className="shell">
        <aside className="sidebar">
          <div className="nav-label">Menyu</div>
          {navItems.map(item => (
            <button key={item.key}
              className={`nav-item${page === item.key ? ' active' : ''}`}
              onClick={() => setPage(item.key)}>
              {item.icon}{item.label}
            </button>
          ))}
          <div className="nav-spacer" />
          <div className="nav-divider" />
          <button className="nav-item" style={{ color: 'var(--red)' }} onClick={logout}>
            {icons.logout}Chiqish
          </button>
        </aside>

        <main className="content">
          {page === 'dashboard' && <Dashboard />}
          {page === 'admin'     && <AdminPanel />}
          {page === 'password'  && <ChangePassword />}
          {page === 'profile'   && (
            <div>
              <div className="page-head" style={{ marginBottom: 24 }}>
                <div><h1>Profil</h1><p>Shaxsiy ma'lumotlaringiz</p></div>
              </div>
              <div className="card" style={{ maxWidth: 520 }}>
                {[
                  ['Username',    user?.username],
                  ['Yosh',        d.age],
                  ['Jins',        d.gender],
                  ['Joylashuv',   d.location],
                  ['Kasb',        d.profession],
                  ['Maqsad',      d.goal],
                  ['Qiziqishlar', d.interests?.join(', ')],
                  ['Ro\'yxatdan o\'tgan', user?.createdAt ? new Date(user.createdAt).toLocaleDateString('uz') : undefined],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 16, padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-2)', minWidth: 160, fontSize: 13 }}>{k}</span>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{v || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

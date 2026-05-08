import { useState, useEffect } from 'react';
import API from '../api';
import { toast } from '../Toast';

// ─── Sub-views ─────────────────────────────────────────────────────────────

function StatsView() {
  const [s, setS] = useState(null);
  useEffect(() => { API.get('/admin/stats').then(r => setS(r.data)).catch(() => toast('Yuklab bo\'lmadi','err')); }, []);
  if (!s) return <div className="centered"><div className="spin" /><p>Yuklanmoqda...</p></div>;

  const Bar = ({ label, value, max }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-2)' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--border-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round((value/max)*100)}%`, background: 'var(--indigo)', borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-head"><div><h1>Statistika</h1><p>Tizim ko'rsatkichlari</p></div></div>

      <div className="grid g-3" style={{ marginBottom: 24 }}>
        {[
          { num: s.totalUsers,   label: 'Jami foydalanuvchi' },
          { num: s.botUsers,     label: 'Bot orqali kirgan' },
          { num: s.last7days,    label: 'Oxirgi 7 kunda qo\'shilgan' },
          { num: s.blockedCount, label: 'Bloklangan' },
        ].map((item, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '18px 14px' }}>
            <div className="stat-num">{item.num}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid g-2">
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Jins taqsimoti</h3>
          {Object.entries(s.genderStats).map(([k, v]) => (
            <Bar key={k} label={k} value={v} max={s.totalUsers || 1} />
          ))}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Yosh guruhlari</h3>
          {Object.entries(s.ageGroups).map(([k, v]) => (
            <Bar key={k} label={k} value={v} max={s.totalUsers || 1} />
          ))}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Mintaqalar (top 8)</h3>
          {Object.entries(s.locationStats).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k, v]) => (
            <Bar key={k} label={k} value={v} max={s.totalUsers || 1} />
          ))}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Qiziqishlar (top 8)</h3>
          {(s.interestStats || []).slice(0,8).map(([k, v]) => (
            <Bar key={k} label={k} value={v} max={s.totalUsers || 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BroadcastView() {
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!msg.trim()) return;
    if (!confirm(`"${msg.slice(0,50)}..." xabarini barcha foydalanuvchilarga yuborasizmi?`)) return;
    setLoading(true);
    try {
      const r = await API.post('/admin/broadcast', { message: msg });
      toast(r.data.message);
      setMsg('');
    } catch (e) { toast(e.response?.data?.message || 'Xatolik', 'err'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-head"><div><h1>Broadcast</h1><p>Bot foydalanuvchilariga xabar yuborish</p></div></div>
      <div className="card">
        <div className="field">
          <label className="label">Xabar matni</label>
          <textarea
            className="input" rows={6} placeholder="Barcha foydalanuvchilarga yuboriladigan xabar..."
            value={msg} onChange={e => setMsg(e.target.value)}
            style={{ resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>
        <button className="btn btn-primary btn-full" onClick={send} disabled={loading || !msg.trim()}>
          {loading ? 'Yuborilmoqda...' : 'Yuborish'}
        </button>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
          Faqat bot orqali kirgan va bloklanmagan foydalanuvchilarga yuboriladi.
        </p>
      </div>
    </div>
  );
}

function UserDetailModal({ user, onClose, onRefresh }) {
  const [resetPwd, setResetPwd] = useState('');
  const [loading, setLoading]   = useState(false);

  const action = async (type) => {
    setLoading(true);
    try {
      if (type === 'block')   { await API.patch(`/admin/users/${user._id}/block`);   toast('Bloklandi'); }
      if (type === 'unblock') { await API.patch(`/admin/users/${user._id}/unblock`); toast('Blokdan chiqarildi'); }
      if (type === 'delete')  {
        if (!confirm(`${user.username} ni o'chirishni tasdiqlaysizmi?`)) { setLoading(false); return; }
        await API.delete(`/admin/users/${user._id}`);
        toast("O'chirildi"); onClose(); onRefresh(); return;
      }
      if (type === 'reset') {
        if (resetPwd.length < 6) { toast('Parol kamida 6 belgi','err'); setLoading(false); return; }
        await API.patch(`/admin/users/${user._id}/reset-password`, { newPassword: resetPwd });
        toast('Parol tiklandi'); setResetPwd('');
      }
      onRefresh();
    } catch (e) { toast(e.response?.data?.message || 'Xatolik', 'err'); }
    finally { setLoading(false); }
  };

  const d = user.demographics || {};

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--indigo-dk),var(--indigo))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 18, color: 'white', flexShrink: 0,
            }}>{user.username[0].toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{user.username}</div>
              <span className={`badge ${user.isBlocked ? 'badge-red' : 'badge-green'}`}>
                {user.isBlocked ? 'Bloklangan' : 'Faol'}
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Yopish</button>
        </div>

        <div className="divider" style={{ marginBottom: 18 }} />

        {/* Info grid */}
        <div className="grid g-2" style={{ marginBottom: 18 }}>
          {[
            ['Yosh',       d.age      || '—'],
            ['Jins',       d.gender   || '—'],
            ['Joylashuv',  d.location || '—'],
            ['Kasb',       d.profession || '—'],
            ['Chat ID',    user.chatId  || '—'],
            ['Qo\'shildi', new Date(user.createdAt).toLocaleDateString('uz')],
          ].map(([k, v]) => (
            <div key={k} style={{ fontSize: 13 }}>
              <div style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
              <div style={{ fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>

        {d.interests?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Qiziqishlar</div>
            <div className="chips">{d.interests.map(i => <span key={i} className="badge badge-indigo">{i}</span>)}</div>
          </div>
        )}

        {/* Password + History */}
        <div className="divider" style={{ marginBottom: 18 }} />
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Joriy parol</div>
          <code style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', padding: '4px 10px', borderRadius: 5, fontSize: 13 }}>{user.password}</code>
        </div>

        {user.passwordHistory?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Parol tarixi</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {user.passwordHistory.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                  <code style={{ background: 'var(--bg-2)', color: 'var(--text-2)', padding: '2px 8px', borderRadius: 4 }}>{p.password}</code>
                  {p.resetBy === 'admin' && <span className="badge badge-amber" style={{ fontSize: 10 }}>Admin</span>}
                  <span style={{ color: 'var(--text-3)' }}>{new Date(p.changedAt).toLocaleDateString('uz')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset password */}
        <div className="divider" style={{ marginBottom: 18 }} />
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Parolni tiklash</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" style={{ flex: 1 }} type="text" placeholder="Yangi parol (kamida 6 belgi)"
              value={resetPwd} onChange={e => setResetPwd(e.target.value)} />
            <button className="btn btn-secondary" onClick={() => action('reset')} disabled={loading}>Tiklash</button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-full"
            onClick={() => action(user.isBlocked ? 'unblock' : 'block')} disabled={loading}>
            {user.isBlocked ? 'Blokdan chiqarish' : 'Bloklash'}
          </button>
          <button className="btn btn-danger btn-full" onClick={() => action('delete')} disabled={loading}>
            O'chirish
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Panel ───────────────────────────────────────────────────────

export default function AdminPanel() {
  const [view,      setView]      = useState('users');
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [detailUser, setDetailUser] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setUsers((await API.get('/admin/users')).data); }
    catch { toast('Yuklab bo\'lmadi', 'err'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (u) => {
    try {
      const r = await API.get(`/admin/users/${u._id}`);
      setDetailUser(r.data);
    } catch { toast('Yuklab bo\'lmadi', 'err'); }
  };

  const filtered = users.filter(u =>
    [u.username, u.demographics?.location, u.demographics?.profession, u.chatId]
      .join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { key: 'users', label: 'Foydalanuvchilar' },
    { key: 'stats', label: 'Statistika' },
    { key: 'broadcast', label: 'Broadcast' },
  ];

  return (
    <div>
      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setView(t.key)} style={{
            padding: '8px 18px', fontSize: 13, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            color: view === t.key ? 'var(--indigo-lt)' : 'var(--text-2)',
            borderBottom: `2px solid ${view === t.key ? 'var(--indigo)' : 'transparent'}`,
            marginBottom: -1, transition: 'all 0.15s ease',
          }}>{t.label}</button>
        ))}
      </div>

      {view === 'stats'     && <StatsView />}
      {view === 'broadcast' && <BroadcastView />}
      {view === 'users' && (
        <>
          <div className="page-head">
            <div>
              <h1>Foydalanuvchilar</h1>
              <p>{filtered.length} ta natija</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input" style={{ width: 220 }} placeholder="Qidirish..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <button className="btn btn-secondary btn-sm" onClick={load}>Yangilash</button>
            </div>
          </div>

          {loading
            ? <div className="centered"><div className="spin" /><p>Yuklanmoqda...</p></div>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Username</th><th>Parol</th><th>Holat</th>
                      <th>Rol</th><th>Yosh</th><th>Jins</th><th>Hudud</th>
                      <th>Kasb</th><th>Qiziqishlar</th><th>Sana</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => {
                      const d = u.demographics || {};
                      return (
                        <tr key={u._id} style={{ cursor: 'pointer' }} onClick={() => openDetail(u)}>
                          <td style={{ color: 'var(--text-3)' }}>{i+1}</td>
                          <td style={{ fontWeight: 600 }}>{u.username}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <code style={{ fontFamily: 'monospace', fontSize: 12,
                              background: 'rgba(239,68,68,0.08)', color: '#fca5a5', padding: '1px 6px', borderRadius: 4 }}>
                              {u.password}
                            </code>
                          </td>
                          <td>
                            <span className={`badge ${u.isBlocked ? 'badge-red' : 'badge-green'}`}>
                              {u.isBlocked ? 'Bloklangan' : 'Faol'}
                            </span>
                          </td>
                          <td><span className={`badge ${u.role==='admin'?'badge-indigo':'badge-gray'}`}>{u.role==='admin'?'Admin':'User'}</span></td>
                          <td>{d.age || '—'}</td>
                          <td>{d.gender || '—'}</td>
                          <td>{d.location || '—'}</td>
                          <td>{d.profession || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                              {d.interests?.slice(0,2).map(t => <span key={t} className="badge badge-cyan" style={{ fontSize: 10 }}>{t}</span>)}
                              {(d.interests?.length||0)>2 && <span className="badge badge-gray" style={{ fontSize: 10 }}>+{d.interests.length-2}</span>}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString('uz')}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openDetail(u)}>Batafsil</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <div className="empty"><h3>Topilmadi</h3><p>Qidiruv shartini o'zgartiring.</p></div>}
              </div>
            )
          }
        </>
      )}

      {detailUser && (
        <UserDetailModal
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onRefresh={() => { load(); setDetailUser(null); }}
        />
      )}
    </div>
  );
}

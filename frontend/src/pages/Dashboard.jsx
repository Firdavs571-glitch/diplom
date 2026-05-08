import { useState, useEffect } from 'react';
import API from '../api';
import { useAuth } from '../AuthContext';

const PRIORITY_STYLE = {
  'yuqori': { cls: 'badge-red',   label: 'Yuqori' },
  "o'rta":  { cls: 'badge-amber', label: "O'rta"  },
  'past':   { cls: 'badge-green', label: 'Past'   },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const d = user?.demographics || {};

  const fetchRecs = async () => {
    setLoading(true);
    setDone(false);
    try {
      const r = await API.get('/recommendations');
      setRecs(r.data);
    } catch { setRecs([]); }
    finally { setLoading(false); setDone(true); }
  };

  return (
    <div>
      {/* Profile summary */}
      <div className="profile-banner">
        <div className="profile-avatar">{user?.username?.[0]?.toUpperCase()}</div>
        <div className="profile-meta" style={{ flex: 1 }}>
          <h2>{user?.username}</h2>
          <p>
            {[d.age && `${d.age} yosh`, d.gender, d.location, d.profession]
              .filter(Boolean).join(' · ')}
          </p>
          {d.interests?.length > 0 && (
            <div className="chips" style={{ marginTop: 10 }}>
              {d.interests.map(i => <span key={i} className="badge badge-indigo">{i}</span>)}
            </div>
          )}
        </div>
        {d.goal && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Maqsad</div>
            <div style={{ fontSize: 13, color: 'var(--text-1)', maxWidth: 200 }}>{d.goal}</div>
          </div>
        )}
      </div>

      {/* CTA — initial state */}
      {!done && !loading && (
        <div className="centered" style={{ minHeight: '35vh', gap: 20 }}>
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>AI Tavsiyalar</h2>
            <p style={{ color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 24 }}>
              Profilingizdagi demografik ma'lumotlar asosida sun'iy intellekt sizga eng mos
              tavsiyalarni tayyorlaydi.
            </p>
            <button className="btn btn-primary btn-lg" onClick={fetchRecs}>
              Tavsiyalarni yuklash
            </button>
          </div>
        </div>
      )}

      {/* AI loading */}
      {loading && (
        <div className="centered" style={{ minHeight: '35vh' }}>
          <div className="pulse-orb">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Tahlil qilinmoqda</div>
            <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
              Profilingizga eng mos tavsiyalar tayyorlanmoqda...
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {done && !loading && (
        <>
          <div className="page-head">
            <div>
              <h1>{recs.length} ta tavsiya</h1>
              <p>Profilingizdagi ma'lumotlar asosida tuzildi</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchRecs}>Yangilash</button>
          </div>

          {recs.length === 0
            ? <div className="empty"><h3>Tavsiyalar topilmadi</h3><p>Profilingizni to'liqroq to'ldiring va qayta urinib ko'ring.</p></div>
            : (
              <div className="grid g-auto">
                {recs.map((r, i) => {
                  const p = PRIORITY_STYLE[r.priority] || PRIORITY_STYLE['past'];
                  return (
                    <div key={i} className="rec-card">
                      <div className="rec-footer" style={{ marginBottom: 12 }}>
                        <span className="badge badge-cyan">{r.category}</span>
                        <span className={`badge ${p.cls}`}>{p.label}</span>
                      </div>
                      <div className="rec-title">{r.title}</div>
                      <div className="rec-desc">{r.description}</div>
                      {r.why && <div className="rec-why">{r.why}</div>}
                      {r.link && <div className="rec-link"><a href={r.link} target="_blank" rel="noreferrer">{r.link}</a></div>}
                    </div>
                  );
                })}
              </div>
            )
          }
        </>
      )}
    </div>
  );
}

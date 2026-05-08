import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { toast } from '../Toast';

export default function Login({ onRegister }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      await login(username, password);
      toast('Xush kelibsiz');
    } catch (e) {
      toast(e.response?.data?.message || 'Login yoki parol xato', 'err');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="bg-glow" />
      <div className="auth-panel">
        <div className="auth-head">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginBottom: 16, padding: '4px 12px',
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 99, fontSize: 11, fontWeight: 600, color: 'var(--indigo-lt)'
          }}>
            AI-Powered Recommendation System
          </div>
          <h1>TavsiyaAI</h1>
          <p>Demografik ma'lumotlaringiz asosida shaxsiy tavsiyalar</p>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label className="label">Login</label>
            <input id="login-user" className="input" placeholder="Username kiriting"
              value={username} onChange={e => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label className="label">Parol</label>
            <input id="login-pass" className="input" type="password" placeholder="Parolingiz"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button id="login-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Kirish...' : 'Kirish'}
          </button>
        </form>

        <div className="auth-sep">yoki</div>
        <button className="btn btn-ghost btn-full" onClick={onRegister}>Yangi hisob yaratish</button>

        <div style={{
          marginTop: 20, padding: 14, borderRadius: 9,
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.7
        }}>
          Telegram bot orqali ham foydalanishingiz mumkin.<br />
          <span style={{ color: 'var(--indigo-lt)' }}>Bot orqali ro'yxatdan o'tsangiz, shu login va parol bilan saytga kirasiz.</span>
        </div>
      </div>
    </div>
  );
}

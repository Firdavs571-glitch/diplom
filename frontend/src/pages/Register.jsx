import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { toast } from '../Toast';

const INTERESTS = ['IT va Dasturlash','Biznes',"San'at",'Tibbiyot',"Ta'lim",'Sport','Musiqa','Sayohat','Oziq-ovqat','Fan'];
const STEPS = ['Hisob', "Shaxsiy ma'lumotlar", 'Qiziqishlar'];

export default function Register({ onLogin }) {
  const { register } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username:'', password:'', age:'', gender:'', location:'', profession:'', goal:'', interests:[]
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleInterest = (i) => setForm(p => ({
    ...p,
    interests: p.interests.includes(i) ? p.interests.filter(x=>x!==i) : [...p.interests, i]
  }));

  const validate = () => {
    const err = {};
    if (step === 0) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) err.username = '3–20 ta lotin harfi, raqam yoki _';
      if (form.password.length < 6) err.password = 'Kamida 6 ta belgi';
    }
    if (step === 1) {
      const a = Number(form.age);
      if (!form.age || isNaN(a) || a < 5 || a > 100) err.age = '5 dan 100 gacha';
      if (!form.gender) err.gender = 'Jinsingizni tanlang';
      if (!form.location.trim()) err.location = 'Majburiy maydon';
      if (!form.profession.trim()) err.profession = 'Majburiy maydon';
    }
    if (step === 2 && form.interests.length === 0) err.interests = 'Kamida bittasini tanlang';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form);
      toast('Profil yaratildi');
    } catch (e) {
      toast(e.response?.data?.message || 'Xatolik yuz berdi', 'err');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="bg-glow" />
      <div className="auth-panel">
        <div className="auth-head">
          <h1>Ro'yxatdan o'tish</h1>
          <p>Shaxsiy profilingizni yarating va AI tavsiyalarini oling</p>
        </div>

        {/* Step indicator */}
        <div className="steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              <div className="step-dot">{i < step ? '✓' : i + 1}</div>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
          Qadam {step + 1} / {STEPS.length} — {STEPS[step]}
        </p>

        {step === 0 && (
          <>
            <div className="field">
              <label className="label">Login</label>
              <input className={`input${errors.username?' input-error':''}`} placeholder="masalan: ali_karimov"
                value={form.username} onChange={e => set('username', e.target.value)} />
              {errors.username && <p className="error-msg">{errors.username}</p>}
            </div>
            <div className="field">
              <label className="label">Parol</label>
              <input className={`input${errors.password?' input-error':''}`} type="password" placeholder="Kamida 6 ta belgi"
                value={form.password} onChange={e => set('password', e.target.value)} />
              {errors.password && <p className="error-msg">{errors.password}</p>}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="row-2">
              <div className="field">
                <label className="label">Yosh</label>
                <input className={`input${errors.age?' input-error':''}`} type="number" placeholder="24"
                  value={form.age} onChange={e => set('age', e.target.value)} />
                {errors.age && <p className="error-msg">{errors.age}</p>}
              </div>
              <div className="field">
                <label className="label">Jins</label>
                <div className="chips" style={{ marginTop: 2 }}>
                  {['Erkak','Ayol'].map(g => (
                    <button key={g} className={`chip${form.gender===g?' on':''}`} onClick={()=>set('gender',g)}>{g}</button>
                  ))}
                </div>
                {errors.gender && <p className="error-msg">{errors.gender}</p>}
              </div>
            </div>
            <div className="field">
              <label className="label">Shahar yoki viloyat</label>
              <input className={`input${errors.location?' input-error':''}`} placeholder="masalan: Toshkent"
                value={form.location} onChange={e => set('location', e.target.value)} />
              {errors.location && <p className="error-msg">{errors.location}</p>}
            </div>
            <div className="field">
              <label className="label">Kasb yoki ta'lim yo'nalishi</label>
              <input className={`input${errors.profession?' input-error':''}`} placeholder="masalan: Dasturchi, Talaba"
                value={form.profession} onChange={e => set('profession', e.target.value)} />
              {errors.profession && <p className="error-msg">{errors.profession}</p>}
            </div>
            <div className="field">
              <label className="label">Asosiy maqsad <span style={{color:'var(--text-3)',fontWeight:400}}>(ixtiyoriy)</span></label>
              <input className="input" placeholder="masalan: Yangi kasb o'rganish"
                value={form.goal} onChange={e => set('goal', e.target.value)} />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="field">
            <label className="label" style={{ marginBottom: 12 }}>Qiziqishlar</label>
            <div className="chips">
              {INTERESTS.map(i => (
                <button key={i} className={`chip${form.interests.includes(i)?' on':''}`} onClick={()=>toggleInterest(i)}>{i}</button>
              ))}
            </div>
            {errors.interests && <p className="error-msg" style={{ marginTop: 8 }}>{errors.interests}</p>}
          </div>
        )}

        <div style={{ display:'flex', gap:10, marginTop:4 }}>
          {step > 0 && <button className="btn btn-ghost btn-full" onClick={back}>Orqaga</button>}
          {step < 2
            ? <button className="btn btn-primary btn-full" onClick={next}>Davom etish</button>
            : <button className="btn btn-primary btn-full" onClick={submit} disabled={loading}>
                {loading ? 'Yaratilmoqda...' : 'Boshlash'}
              </button>
          }
        </div>

        <div className="auth-sep">yoki</div>
        <button className="btn btn-ghost btn-full" onClick={onLogin}>Hisobingiz bormi? Kirish</button>
      </div>
    </div>
  );
}

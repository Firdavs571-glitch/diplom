import { useState } from 'react';
import API from '../api';
import { toast } from '../Toast';

export default function ChangePassword() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm)
      return toast('Yangi parollar mos kelmaydi', 'err');
    if (form.newPassword.length < 6)
      return toast('Yangi parol kamida 6 ta belgi', 'err');
    setLoading(true);
    try {
      await API.put('/profile/password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      toast('Parol muvaffaqiyatli yangilandi');
      setForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (e) {
      toast(e.response?.data?.message || 'Xatolik yuz berdi', 'err');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div>
          <h1>Parolni yangilash</h1>
          <p>Eski parolingizni tasdiqlab yangi parol o'rnating</p>
        </div>
      </div>

      <form onSubmit={submit} style={{ maxWidth: 440 }}>
        <div className="card">
          <div className="field">
            <label className="label">Joriy parol</label>
            <input className="input" type="password" placeholder="Hozirgi parolingiz"
              value={form.oldPassword} onChange={e => set('oldPassword', e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Yangi parol</label>
            <input className="input" type="password" placeholder="Kamida 6 ta belgi"
              value={form.newPassword} onChange={e => set('newPassword', e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Yangi parolni tasdiqlang</label>
            <input className="input" type="password" placeholder="Yangi parolni qaytaring"
              value={form.confirm} onChange={e => set('confirm', e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Saqlanmoqda...' : 'Yangilash'}
          </button>

          <div style={{ marginTop: 16, padding: 14, borderRadius: 8,
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
            Parolni yangilaganingizdan keyin shu yangi parol bilan saytga va Telegram botga kirishingiz mumkin.
            Eski parollaringiz admin tomonidan ko'rish imkoniyati uchun saqlab qolinadi.
          </div>
        </div>
      </form>
    </div>
  );
}

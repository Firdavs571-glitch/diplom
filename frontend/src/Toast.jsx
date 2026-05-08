import { useState } from 'react';

let setToastsGlobal = null;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  setToastsGlobal = setToasts;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

export function toast(msg, type = 'success') {
  if (!setToastsGlobal) return;
  const id = Date.now();
  setToastsGlobal(prev => [...prev, { id, msg, type }]);
  setTimeout(() => setToastsGlobal(prev => prev.filter(t => t.id !== id)), 3500);
}

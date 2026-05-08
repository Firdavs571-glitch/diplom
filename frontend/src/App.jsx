import { useState } from 'react';
import { useAuth } from './AuthContext';
import { ToastContainer } from './Toast';
import Login from './pages/Login';
import Register from './pages/Register';
import AppLayout from './pages/AppLayout';

export default function App() {
  const { user, loading } = useAuth();
  const [showReg, setShowReg] = useState(false);

  if (loading) {
    return (
      <div className="centered" style={{ minHeight: '100vh' }}>
        <div className="bg-glow" />
        <div className="spin" />
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-glow" />
      {user
        ? <AppLayout />
        : showReg
          ? <Register onLogin={() => setShowReg(false)} />
          : <Login onRegister={() => setShowReg(true)} />
      }
      <ToastContainer />
    </>
  );
}

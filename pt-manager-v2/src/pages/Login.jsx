import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // MARCA QUESTA SCHEDA DEL BROWSER COME "ADMIN"
      sessionStorage.setItem('app_role', 'admin');
      
      navigate('/');
    } catch (err) {
      setError("Credenziali non valide. Riprova.");
      console.error("Errore di login admin:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-2xl border border-white/10 shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-white">Accesso Admin</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block mb-1 text-sm font-medium text-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 bg-background border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2 bg-background border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div>
            <button type="submit" className="w-full px-4 py-2.5 font-bold text-white bg-primary rounded-lg hover:bg-primary/80">
              Accedi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


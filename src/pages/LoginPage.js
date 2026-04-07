// src/pages/LoginPage.js
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/shared/Spinner';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError('Email o password non corretti. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700
      flex flex-col items-center justify-center p-6">
      {/* Logo area */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
        </div>
        <div className="text-center">
        <h1 className="text-white text-2xl font-bold">Bruno Store Check</h1>
<p className="text-primary-200 text-sm">Funzione Commerciale</p>
        </div>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <h2 className="text-slate-800 font-bold text-lg mb-1">Accedi al tuo account</h2>
        <p className="text-slate-500 text-sm mb-6">Le credenziali vengono fornite dall'amministratore.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="nome@azienda.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="input-field pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading ? <Spinner size="sm" color="white" /> : null}
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>

      <p className="text-primary-300 text-xs mt-6 text-center">
        Non hai le credenziali? Contatta il tuo amministratore.
      </p>
    </div>
  );
}

import React, { useState } from 'react';

interface Props {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await chrome.runtime.sendMessage({ type: 'LOGIN', email, password });
      if (res.success) {
        onLoginSuccess();
      } else {
        setError(res.error?.message || 'Login failed.');
      }
    } catch {
      setError('Communication error with background script.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ margin: 0, textAlign: 'center' }}>Clyro Vault</h2>
      <p style={{ margin: 0, textAlign: 'center', color: '#a0aec0', fontSize: '14px' }}>Sign in to access your vault</p>
      
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#cbd5e1' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: 'white' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#cbd5e1' }}>Master Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: 'white' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, marginTop: '8px' }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

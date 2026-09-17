import React, { useState } from 'react';
import InteractiveHoverButton from './InteractiveHoverButton';
import TextType from './TextType';

interface Props {
  onUnlockSuccess: () => void;
}

export default function VaultUnlockView({ onUnlockSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await chrome.runtime.sendMessage({ type: 'UNLOCK_VAULT', masterPassword: password });
      if (res.success) {
        onUnlockSuccess();
      } else {
        setError(res.error?.message || 'Failed to unlock vault. Incorrect master password?');
      }
    } catch {
      setError('Communication error with background script.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ margin: 0, textAlign: 'center' }}>Vault Locked</h2>
      <TextType
        as="p"
        text="Enter your Master Password to decrypt your vault."
        loop={false}
        style={{ margin: 0, textAlign: 'center', color: '#a0aec0', fontSize: '14px', width: '100%' }}
      />
      
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <input
            type="password"
            placeholder="Master Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: 'white' }}
          />
        </div>
        <InteractiveHoverButton type="submit" disabled={loading}>
          {loading ? 'Decrypting...' : 'Unlock Vault'}
        </InteractiveHoverButton>
      </form>
    </div>
  );
}

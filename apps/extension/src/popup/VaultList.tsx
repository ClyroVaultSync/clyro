import React, { useEffect, useState } from 'react';
import type { VaultItem } from '@clyro/shared-types';

interface Props {
  onLock: () => void;
}

export default function VaultList({ onLock }: Props) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GET_VAULT_ITEMS' });
      if (res.success) {
        setItems(res.data || []);
      } else {
        setError(res.error?.message || 'Failed to fetch items.');
      }
    } catch {
      setError('Communication error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleLock = async () => {
    await chrome.runtime.sendMessage({ type: 'LOCK_VAULT' });
    onLock();
  };

  const handleAddItem = async () => {
    const newItem: VaultItem = {
      id: crypto.randomUUID(),
      name: 'New Account',
      url: 'https://example.com',
      username: 'user@example.com',
      password: 'password123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    saveItems(newItems);
  };

  const saveItems = async (itemsToSave: VaultItem[]) => {
    setSaving(true);
    setError('');
    try {
      const res = await chrome.runtime.sendMessage({ type: 'SAVE_VAULT_ITEMS', items: itemsToSave });
      if (!res.success) {
        setError(res.error?.message || 'Failed to save.');
        fetchItems(); // revert to server state
      }
    } catch {
      setError('Communication error while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>My Vault</h3>
        <button onClick={handleLock} style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>
          Lock
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px', borderRadius: '4px', fontSize: '12px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Loading items...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Vault is empty.</div>
        ) : (
          items.map(item => (
            <div key={item.id} style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{item.name}</div>
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>{item.username}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '16px' }}>
        <button 
          onClick={handleAddItem} 
          disabled={saving}
          style={{ width: '100%', padding: '10px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}
        >
          {saving ? 'Saving...' : '+ Add Test Item'}
        </button>
      </div>
    </div>
  );
}

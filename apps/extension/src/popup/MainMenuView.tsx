import React, { useState } from 'react';
import WheelPicker from './WheelPicker';
import VaultUnlockView from './VaultUnlockView';
import Shuffle from './Shuffle';

interface Props {
  isUnlocked: boolean;
  onStatusChange: () => void;
}

type MenuAction =
  | 'open-vault'
  | 'lock-vault'
  | 'unlock-vault'
  | 'settings'
  | 'change-storage'
  | 'manage-extension'
  | 'remove-extension';

interface MenuItem {
  label: string;
  action: MenuAction;
}

const UNLOCKED_ITEMS: MenuItem[] = [
  { label: 'Open Vault', action: 'open-vault' },
  { label: 'Lock Vault', action: 'lock-vault' },
  { label: 'Settings', action: 'settings' },
  { label: 'Change Storage Options', action: 'change-storage' },
  { label: 'Manage Extension', action: 'manage-extension' },
  { label: 'Remove from Chrome', action: 'remove-extension' },
];

const LOCKED_ITEMS: MenuItem[] = [
  { label: 'Unlock Vault', action: 'unlock-vault' },
  { label: 'Settings', action: 'settings' },
  { label: 'Change Storage Options', action: 'change-storage' },
  { label: 'Manage Extension', action: 'manage-extension' },
  { label: 'Remove from Chrome', action: 'remove-extension' },
];

// Same wording as OptionsApp's Disconnect confirm — this is a shortcut to
// that same action, not a separate, weaker path.
const DISCONNECT_WARNING =
  "Disconnect this storage provider? Your vault stays where it is — export it first if you don't have a backup, since reconnecting will need either the same provider again or an import.";

export default function MainMenuView({ isUnlocked, onStatusChange }: Props) {
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState('');

  if (unlocking) {
    return (
      <VaultUnlockView
        onUnlockSuccess={() => {
          setUnlocking(false);
          onStatusChange();
        }}
      />
    );
  }

  const items = isUnlocked ? UNLOCKED_ITEMS : LOCKED_ITEMS;

  const handleConfirm = async (index: number) => {
    setError('');
    try {
      switch (items[index].action) {
        case 'unlock-vault':
          setUnlocking(true);
          break;
        case 'open-vault':
          await chrome.tabs.create({ url: chrome.runtime.getURL('vault.html') });
          break;
        case 'lock-vault':
          await chrome.runtime.sendMessage({ type: 'LOCK_VAULT' });
          onStatusChange();
          break;
        case 'settings':
          chrome.runtime.openOptionsPage();
          break;
        case 'change-storage':
          if (window.confirm(DISCONNECT_WARNING)) {
            await chrome.runtime.sendMessage({ type: 'CLEAR_PROVIDER' });
            onStatusChange();
          }
          break;
        case 'manage-extension':
          await chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
          break;
        case 'remove-extension':
          chrome.management.uninstallSelf({ showConfirmDialog: true });
          break;
      }
    } catch {
      setError('Something went wrong running that action.');
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '540px',
        boxSizing: 'border-box',
      }}
    >
      <Shuffle
        text="Clyro"
        tag="h2"
        style={{ margin: 0, fontSize: '12px' }}
        textAlign="center"
        shuffleDirection="right"
        duration={0.35}
        animationMode="evenodd"
        shuffleTimes={1}
        ease="power3.out"
        stagger={0.03}
        threshold={0.1}
        triggerOnce={true}
        triggerOnHover={true}
        respectReducedMotion={true}
      />

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}

      <WheelPicker items={items.map((item) => item.label)} onConfirm={(index) => handleConfirm(index)} />
    </div>
  );
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import VaultApp from './VaultApp';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <VaultApp />
    </React.StrictMode>
  );
}

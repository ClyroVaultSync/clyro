import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), crx({ manifest } as any)],
  build: {
    rollupOptions: {
      // vault.html is opened via chrome.tabs.create + chrome.runtime.getURL, not
      // referenced by any manifest field, so CRXJS won't discover it on its own.
      input: {
        vault: resolve(__dirname, 'vault.html'),
      },
    },
  },
});

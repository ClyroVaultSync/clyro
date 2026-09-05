import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), crx({ manifest } as any)],
  build: {
    rollupOptions: {
      // vault.html and offscreen.html are opened via chrome.tabs.create /
      // chrome.offscreen.createDocument, not referenced by any manifest field,
      // so CRXJS won't discover them on its own.
      input: {
        vault: resolve(__dirname, 'vault.html'),
        offscreen: resolve(__dirname, 'offscreen.html'),
      },
    },
  },
});

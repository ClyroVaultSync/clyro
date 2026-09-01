import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    env: {
      DB_PATH: ':memory:',
    },
  },
});

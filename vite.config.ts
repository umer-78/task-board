import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site is served from https://umer-78.github.io/task-board/, so assets need
// that prefix in production and "/" during local development.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/task-board/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}));

/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base is set for GitHub Pages project sites: https://<user>.github.io/ultimate-scorekeeper/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/ultimate-scorekeeper/' : '/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
});

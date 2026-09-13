/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { appVersion } from './scripts/version.mjs';

// base is set for GitHub Pages project sites: https://<user>.github.io/ultimate-scorekeeper/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/ultimate-scorekeeper/' : '/',
  // Compiled into the hashed bundle rather than fetched at runtime: a stale
  // PWA must report the version it is actually running, not the one the
  // server has. Vitest picks this up from here too.
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
});

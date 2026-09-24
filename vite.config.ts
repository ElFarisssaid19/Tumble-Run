import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Served from https://<user>.github.io/tumble-run/ on GitHub Pages.
  base: '/tumble-run/',
  plugins: [react()],
  build: {
    // Rapier ships its physics engine as WebAssembly inlined into its JS module,
    // so that chunk alone is ~2 MB. Everything else stays well under this.
    chunkSizeWarningLimit: 2500,
    rolldownOptions: {
      output: {
        // Split the big, rarely-changing libraries out so game updates stay small to download.
        codeSplitting: {
          groups: [
            { name: 'rapier', test: /node_modules[\\/]@dimforge/ },
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

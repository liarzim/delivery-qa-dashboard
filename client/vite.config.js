import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // ── Dev server — proxy /api/* to Express backend on :3001 ───────────────
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  // ── Production build: standard static HTML/JS/CSS output ────────────────
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Modern browser targets — ensure the widest compatibility for any
    // browser that supports ES modules (Chrome 87+, Firefox 78+, Safari 14+)
    target: ['es2020', 'chrome87', 'firefox78', 'safari14', 'edge88'],
    rollupOptions: {
      output: {
        // Code-split large chunks so each page loads only what it needs
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts':   ['recharts'],
          'vendor-dnd':      ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-icons':    ['lucide-react'],
        },
      },
    },
    // Raise the chunk-size warning threshold (charts bundle is intentionally large)
    chunkSizeWarningLimit: 900,
  },

  // ── Preview server (npm run preview) ────────────────────────────────────
  preview: {
    port: 4173,
    // Enable SPA fallback so browser-direct deep-links (e.g. /delivery) work
    // when using `vite preview` without a Node server
    open: true,
  },
});

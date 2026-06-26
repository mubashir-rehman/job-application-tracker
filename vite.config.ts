import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon-64.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'HireTrack — Job Application Tracker',
          short_name: 'HireTrack',
          description: 'Track job applications through a 7-phase interview pipeline, with an AI resume builder on the way.',
          theme_color: '#4f46e5',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
            {src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
            {src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
          ],
        },
        workbox: {
          // Precache the app shell; skip the large social-preview JPEGs and the
          // on-demand resume-import parsers (loaded lazily, cached at runtime).
          globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
          globIgnores: ['**/pdf-*.js', '**/pdf.worker*.mjs', '**/docx-*.js', '**/md-convert-*.js'],
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
        },
        // Keep the service worker out of dev to avoid stale-cache surprises.
        devOptions: {enabled: false},
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          // Stable names for the heavy, lazy-loaded resume-import parsers so the
          // service worker can exclude them from the precache (see workbox.globIgnores).
          manualChunks(id) {
            if (id.includes('pdfjs-dist')) return 'pdf';
            if (id.includes('node_modules/mammoth')) return 'docx';
            if (id.includes('node_modules/turndown')) return 'md-convert';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy API calls to the local dev API server (server/dev-api.ts).
      // In production on Vercel, /api/* are serverless functions — no proxy needed.
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.API_PORT || 3001}`,
          changeOrigin: true,
        },
      },
    },
  };
});

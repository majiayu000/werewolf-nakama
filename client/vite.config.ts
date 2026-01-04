import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['wolf.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: '狼人杀 - Werewolf Online',
        short_name: '狼人杀',
        description: '在线多人狼人杀游戏 - 与好友一起推理、欺骗、生存',
        theme_color: '#0f0f23',
        background_color: '#0f0f23',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['games', 'entertainment'],
        lang: 'zh-CN',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: 'screenshot-lobby.png',
            sizes: '540x720',
            type: 'image/png',
            label: '游戏大厅',
          },
          {
            src: 'screenshot-game.png',
            sizes: '540x720',
            type: 'image/png',
            label: '游戏界面',
          },
        ],
      },
      workbox: {
        // Cache strategies
        runtimeCaching: [
          {
            // Cache API requests
            urlPattern: /^https?:\/\/.*\/v2\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Cache static assets
            urlPattern: /\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
        // Don't cache WebSocket connections
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/v2\//, /^\/api\//],
        // Clean old caches
        cleanupOutdatedCaches: true,
        // Skip waiting for new service worker
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/v2': {
        target: 'http://localhost:7350',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

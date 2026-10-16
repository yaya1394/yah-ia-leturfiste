import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import express, { type Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function apiPlugin(expressApp: Express): Plugin {
  return {
    name: 'yahia-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api')) {
          req.url = req.url.replace(/^\/api/, '') || '/';
          expressApp(req as any, res as any, next);
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(async ({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  const { apiRouter } = await import('./server/apiRouter.ts');
  const expressApp = express();
  expressApp.use(apiRouter);
  const rootDir = fileURLToPath(new URL('.', import.meta.url));

  return {
    plugins: [
      react(),
      tailwindcss(),
      apiPlugin(expressApp),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        manifest: {
          id: '/',
          name: 'Yah.IA.LeTurfiste — Intelligence Hippique & Pronostics PMU',
          short_name: 'Yah.IA',
          description: 'API & Plateforme d\'Intelligence Artificielle pour les courses hippiques, Quinté+ et pronostics PMU en temps réel.',
          theme_color: '#090d16',
          background_color: '#090d16',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

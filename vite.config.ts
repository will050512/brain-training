import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_HASH__: JSON.stringify(process.env.VITE_BUILD_HASH ?? '')
  },
  plugins: [
    vue(), 
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'robots.txt', 'offline.html', 'logo.svg'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: '愛護腦 Al MindCare - 認知健康',
        short_name: '愛護腦',
        description: '由未來家 Next Home AI 開發，專為長者設計的認知訓練遊戲平台，結合科學驗證的認知訓練方法與 AI 技術，幫助維持大腦健康',
        theme_color: '#667eea',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/brain-training/',
        start_url: '/brain-training/',
        categories: ['health', 'medical', 'games'],
        lang: 'zh-TW',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: undefined,
      devOptions: {
        enabled: true
      }
    })
  ],
  base: '/brain-training/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Avoid EPERM on Windows when files in dist are locked by other processes.
    emptyOutDir: false,
  },
})

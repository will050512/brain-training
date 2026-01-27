import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  plugins: [
    vue(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'robots.txt', 'offline.html', 'logo.svg'],
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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,mp3,wav,ogg,webp,jpg,jpeg,gif,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // 確保樣式變更能即時生效
        skipWaiting: true,
        clientsClaim: true,
        // 導航回退設定
        navigateFallback: '/brain-training/index.html',
        navigateFallbackAllowlist: [/^\/brain-training\/.*/],
        // 離線回退頁面
        offlineGoogleAnalytics: false,
        runtimeCaching: [
          {
            // CSS 和 JS 使用 StaleWhileRevalidate 確保更新即時生效
            urlPattern: /\.(?:css|js)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          {
            // 圖片資源使用 CacheFirst 策略
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // 音訊資源使用 CacheFirst 策略
            urlPattern: /\.(?:mp3|wav|ogg|m4a)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
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
  },
})

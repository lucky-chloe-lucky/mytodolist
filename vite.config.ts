import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' keeps asset paths relative so the build works on GitHub Pages
// project sites (username.github.io/<repo>/) without knowing the repo name.
export default defineConfig({
  base: './',
  server: { port: 5273, strictPort: true },
  preview: { port: 5273, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Flow — 나의 업무 보드',
        short_name: 'Flow',
        description: 'Todo · 데일리 리포트 · 프로젝트 일정 · 스크럼을 한 곳에서',
        theme_color: '#1c1917',
        background_color: '#f6f5f3',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
})

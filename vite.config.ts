import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // 상대 경로 → GitHub Pages의 /<repo>/ 하위 경로에서도 에셋이 정상 로드된다(SPA, 라우터 없음)
  base: './',
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})

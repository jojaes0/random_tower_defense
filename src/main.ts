import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

// ── iOS Safari 더블탭 확대 차단 (전역) ──
// iOS는 viewport user-scalable=no / CSS touch-action 을 더블탭 줌에 대해 무시한다.
// 320ms 이내의 두 번째 탭 touchend 기본 동작(확대)을 막되, 버튼 등 클릭 대상은
// 직접 click()을 발생시켜 동작은 그대로 유지(업그레이드 연타 등 손실 방지).
let lastTouchEnd = 0
document.addEventListener(
  'touchend',
  (e) => {
    if (e.touches.length > 0) return // 멀티터치(핀치 등)는 무시
    const now = e.timeStamp
    if (now - lastTouchEnd <= 320 && e.cancelable) {
      e.preventDefault() // 더블탭 줌 + 합성 클릭 차단
      const el = (e.target as HTMLElement | null)?.closest?.('button, a, [role="button"], input, label') as HTMLElement | null
      if (el) el.click() // 클릭 대상이면 동작은 유지
    }
    lastTouchEnd = now
  },
  { passive: false },
)

createApp(App).mount('#app')

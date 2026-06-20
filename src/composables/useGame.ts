// 엔진을 Vue 반응형으로 감싸고 RAF 게임 루프를 돌린다. 속도/일시정지 지원.

import { onUnmounted, reactive, ref } from 'vue'
import { GameEngine } from '@/engine/GameEngine'

export const useGame = () => {
  const engine = new GameEngine(() => {})
  engine.state = reactive(engine.state)

  /** 0 = 일시정지, 1/2/3 = 배속 */
  const speed = ref(1)
  let prevSpeed = 1 // 일시정지 직전 배속 기억
  const setSpeed = (s: number) => {
    if (s > 0) prevSpeed = s
    speed.value = s
  }
  const togglePause = () => {
    if (speed.value === 0) speed.value = prevSpeed
    else {
      prevSpeed = speed.value
      speed.value = 0
    }
  }
  /** 일시정지면 직전 배속으로 복귀 */
  const resume = () => {
    if (speed.value === 0) speed.value = prevSpeed
  }

  let raf = 0
  let last = performance.now()

  const loop = (now: number) => {
    const real = Math.min((now - last) / 1000, 0.05)
    last = now
    const dt = real * speed.value
    if (dt > 0) engine.tick(dt)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  onUnmounted(() => cancelAnimationFrame(raf))

  return { engine, state: engine.state, speed, setSpeed, togglePause, resume }
}

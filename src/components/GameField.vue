<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { GameEngine } from '@/engine/GameEngine'
import { FIELD, GRID, PATH_END, PATH_START, WAYPOINTS, buildableCells, snapToGrid } from '@/engine/path'
import type { Vec2 } from '@/engine/types'

const props = defineProps<{
  engine: GameEngine
  buildMode: 'idle' | 'common' | 'hero' | 'merge'
  heroId: string | null
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const wrapRef = ref<HTMLDivElement | null>(null)
const hover = ref<Vec2 | null>(null)

// 뷰 변환(CSS px 기준): 화면좌표 = world*scale + t
const view = { scale: 1, tx: 0, ty: 0 }
let cw = 0
let ch = 0
let dpr = 1
let raf = 0

// 관성(부드러운 화면 이동): 드래그 속도 → 놓으면 감속하며 미끄러짐
let lastMoveVX = 0
let lastMoveVY = 0
let momVX = 0
let momVY = 0
let momentum = false
const FRICTION = 0.9

const MINS = { s: 0.4 }
const MAXS = { s: 6 }

// ---- 좌표 변환 ----
const worldFromClient = (clientX: number, clientY: number): Vec2 => {
  const rect = canvasRef.value!.getBoundingClientRect()
  const sx = clientX - rect.left
  const sy = clientY - rect.top
  return { x: (sx - view.tx) / view.scale, y: (sy - view.ty) / view.scale }
}

// ---- 화면 맞춤/리사이즈 ----
const resize = () => {
  const wrap = wrapRef.value
  const cvs = canvasRef.value
  if (!wrap || !cvs) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  cw = wrap.clientWidth
  ch = wrap.clientHeight
  cvs.width = Math.round(cw * dpr)
  cvs.height = Math.round(ch * dpr)
  cvs.style.width = cw + 'px'
  cvs.style.height = ch + 'px'
}
const fitView = () => {
  if (!cw || !ch) return
  const s = Math.min(cw / FIELD.width, ch / FIELD.height) * 0.98
  view.scale = s
  view.tx = (cw - FIELD.width * s) / 2
  view.ty = (ch - FIELD.height * s) / 2
}
const clampScale = (s: number) => Math.max(MINS.s, Math.min(MAXS.s, s))
const zoomAround = (sx: number, sy: number, factor: number) => {
  const ns = clampScale(view.scale * factor)
  view.tx = sx - ((sx - view.tx) / view.scale) * ns
  view.ty = sy - ((sy - view.ty) / view.scale) * ns
  view.scale = ns
}
const zoomButton = (factor: number) => zoomAround(cw / 2, ch / 2, factor)

// ---- 포인터(마우스/터치) 제스처: 탭=건설/선택, 드래그=팬, 핀치=줌 ----
const pointers = new Map<number, { x: number; y: number }>()
let gesture: 'none' | 'pan' | 'pinch' = 'none'
let downX = 0
let downY = 0
let moved = false
let lastDist = 0

const onPointerDown = (e: PointerEvent) => {
  canvasRef.value!.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  momentum = false // 새 터치 시 관성 멈춤
  if (pointers.size === 1) {
    gesture = 'pan'
    downX = e.clientX
    downY = e.clientY
    moved = false
    lastMoveVX = lastMoveVY = 0
  } else if (pointers.size === 2) {
    gesture = 'pinch'
    const [p1, p2] = [...pointers.values()]
    lastDist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
  }
}
const onPointerMove = (e: PointerEvent) => {
  if (e.pointerType === 'mouse' && !pointers.has(e.pointerId)) {
    hover.value = worldFromClient(e.clientX, e.clientY) // 마우스 호버 미리보기
  }
  if (!pointers.has(e.pointerId)) return
  const prev = pointers.get(e.pointerId)!
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (gesture === 'pinch' && pointers.size >= 2) {
    const [p1, p2] = [...pointers.values()]
    const d = Math.hypot(p1.x - p2.x, p1.y - p2.y)
    const rect = canvasRef.value!.getBoundingClientRect()
    const mx = (p1.x + p2.x) / 2 - rect.left
    const my = (p1.y + p2.y) / 2 - rect.top
    if (lastDist > 0) zoomAround(mx, my, d / lastDist)
    lastDist = d
  } else if (gesture === 'pan') {
    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    view.tx += dx
    view.ty += dy
    lastMoveVX = dx
    lastMoveVY = dy
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) moved = true
  }
}
const onPointerUp = (e: PointerEvent) => {
  const sizeBefore = pointers.size
  const wasTap = gesture === 'pan' && !moved && sizeBefore === 1
  const wasPan = gesture === 'pan' && moved && sizeBefore === 1
  pointers.delete(e.pointerId)
  if (wasTap) handleTap(e.clientX, e.clientY)
  if (wasPan && pointers.size === 0) {
    // 놓는 순간의 속도로 관성 시작
    momVX = lastMoveVX
    momVY = lastMoveVY
    momentum = Math.hypot(momVX, momVY) > 0.4
  }
  gesture = pointers.size === 2 ? 'pinch' : pointers.size === 1 ? 'pan' : 'none'
  if (pointers.size < 2) lastDist = 0
}
const onWheel = (e: WheelEvent) => {
  e.preventDefault()
  momentum = false
  const rect = canvasRef.value!.getBoundingClientRect()
  zoomAround(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12)
}

const handleTap = (clientX: number, clientY: number) => {
  const pos = worldFromClient(clientX, clientY)
  if (props.buildMode === 'common') return void props.engine.buildCommonTower(pos)
  if (props.buildMode === 'hero' && props.heroId) return void props.engine.buildHeroTower(props.heroId, pos)
  const hit = props.engine.state.towers.find((t) => Math.hypot(t.pos.x - pos.x, t.pos.y - pos.y) <= GRID.size / 2)
  if (props.buildMode === 'merge') {
    if (!hit) return void props.engine.selectTower(null)
    props.engine.selectTower(hit.uid)
    props.engine.mergeTower(hit.uid) // 성공/실패 이펙트는 엔진이 발생
    return
  }
  props.engine.selectTower(hit ? hit.uid : null)
}

// ---- 효과 타이밍(시간 기반) ----
const effectStart = new Map<number, number>()
const EFFECT_MS = 650

const raceColor = (r: string) => (r === 'terran' ? '#3b82f6' : r === 'protoss' ? '#f59e0b' : '#a855f7')
const raceShort = (r: string) => (r === 'terran' ? 'T' : r === 'protoss' ? 'P' : 'Z')
const fmtHp = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : `${Math.round(n)}`)

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const draw = () => {
  const c = canvasRef.value
  if (!c) return
  const ctx = c.getContext('2d')!
  const s = props.engine.state
  const now = performance.now()

  // 관성 이동(부드러운 감속)
  if (momentum && gesture === 'none') {
    view.tx += momVX
    view.ty += momVY
    momVX *= FRICTION
    momVY *= FRICTION
    if (Math.hypot(momVX, momVY) < 0.15) momentum = false
  }

  // 배경(화면 전체)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#060a14'
  ctx.fillRect(0, 0, c.width, c.height)

  // 월드 변환 적용
  ctx.setTransform(view.scale * dpr, 0, 0, view.scale * dpr, view.tx * dpr, view.ty * dpr)

  // 맵 바탕
  ctx.fillStyle = '#0b1220'
  ctx.fillRect(0, 0, FIELD.width, FIELD.height)

  // 설치 칸
  const half = GRID.size / 2
  for (const cell of buildableCells) {
    ctx.fillStyle = 'rgba(255,255,255,0.035)'
    ctx.fillRect(cell.x - half + 1, cell.y - half + 1, GRID.size - 2, GRID.size - 2)
    ctx.strokeStyle = 'rgba(120,150,200,0.16)'
    ctx.lineWidth = 1
    ctx.strokeRect(cell.x - half + 1, cell.y - half + 1, GRID.size - 2, GRID.size - 2)
  }

  // 경로
  ctx.strokeStyle = '#1f2d45'
  ctx.lineWidth = 36
  ctx.lineJoin = ctx.lineCap = 'round'
  ctx.beginPath()
  WAYPOINTS.forEach((w, i) => (i === 0 ? ctx.moveTo(w.x, w.y) : ctx.lineTo(w.x, w.y)))
  ctx.stroke()
  ctx.strokeStyle = '#2a3c5c'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 10])
  ctx.stroke()
  ctx.setLineDash([])
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#22c55e'
  ctx.fillText('▶ 입구', PATH_START.x + 14, PATH_START.y - 12)
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(PATH_END.x, PATH_END.y, 9, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(239,68,68,0.25)'
  ctx.fill()
  ctx.fillStyle = '#ef4444'
  ctx.fillText('출구', PATH_END.x, PATH_END.y - 14)
  ctx.textAlign = 'left'

  const sel = props.engine.selectedTower
  const partner = sel ? props.engine.mergePartner(sel.uid) : null

  if (sel) {
    const st = props.engine.effectiveStats(sel.blueprint)
    ctx.beginPath()
    ctx.arc(sel.pos.x, sel.pos.y, st.range, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(96,165,250,0.08)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(96,165,250,0.5)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  // 타워
  ctx.textAlign = 'center'
  for (const t of s.towers) {
    const bp = t.blueprint
    const isSel = sel?.uid === t.uid
    const isPartner = partner?.uid === t.uid
    const bx = t.pos.x
    const by = t.pos.y
    const r = 16
    ctx.fillStyle = bp.color
    ctx.globalAlpha = 0.22
    roundRect(ctx, bx - r, by - r, r * 2, r * 2, 6)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = isSel ? '#ffffff' : isPartner ? '#22d3ee' : raceColor(bp.race)
    ctx.lineWidth = isSel || isPartner ? 3 : 2
    roundRect(ctx, bx - r, by - r, r * 2, r * 2, 6)
    ctx.stroke()
    ctx.font = '17px "Segoe UI Emoji", sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.fillText(bp.icon, bx, by - 1)
    ctx.font = 'bold 8px sans-serif'
    ctx.fillStyle = raceColor(bp.race)
    ctx.fillText(raceShort(bp.race), bx - r + 4, by - r + 4)
    ctx.font = '8px sans-serif'
    ctx.textBaseline = 'top'
    const lw = ctx.measureText(bp.name).width + 6
    ctx.fillStyle = 'rgba(2,6,16,0.78)'
    roundRect(ctx, bx - lw / 2, by + r - 1, lw, 11, 3)
    ctx.fill()
    ctx.fillStyle = bp.color
    ctx.fillText(bp.name, bx, by + r)
  }
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  // 적
  for (const e of s.enemies) {
    ctx.beginPath()
    ctx.arc(e.pos.x, e.pos.y, e.blueprint.radius, 0, Math.PI * 2)
    ctx.fillStyle = e.isMission ? '#f97316' : e.isBoss ? '#ef4444' : '#e2e8f0'
    ctx.fill()
    ctx.strokeStyle = e.isMission ? '#fdba74' : '#000'
    ctx.lineWidth = e.isMission ? 2 : 1
    ctx.stroke()
    if (e.stunTimer > 0 || e.slowTimer > 0) {
      ctx.beginPath()
      ctx.arc(e.pos.x, e.pos.y, e.blueprint.radius + 3, 0, Math.PI * 2)
      ctx.strokeStyle = e.stunTimer > 0 ? '#fde047' : '#7dd3fc'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    const w = e.blueprint.radius * 2
    const ratio = Math.max(0, e.hp / e.maxHp)
    ctx.fillStyle = '#000'
    ctx.fillRect(e.pos.x - w / 2, e.pos.y - e.blueprint.radius - 7, w, 4)
    ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#f59e0b' : '#ef4444'
    ctx.fillRect(e.pos.x - w / 2, e.pos.y - e.blueprint.radius - 7, w * ratio, 4)
    if (e.isBoss || e.isMission) {
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fff'
      ctx.fillText(`${fmtHp(e.hp)} / ${fmtHp(e.maxHp)}`, e.pos.x, e.pos.y - e.blueprint.radius - 10)
      ctx.textAlign = 'left'
    }
  }

  // 발사체
  for (const p of s.projectiles) {
    const x = p.from.x + (p.to.x - p.from.x) * p.t
    const y = p.from.y + (p.to.y - p.from.y) * p.t
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fillStyle = p.color
    ctx.fill()
  }

  // 합성 효과
  for (const fx of s.effects) {
    if (!effectStart.has(fx.id)) effectStart.set(fx.id, now)
    const age = now - effectStart.get(fx.id)!
    const k = Math.min(age / EFFECT_MS, 1)
    ctx.globalAlpha = 1 - k
    if (fx.kind === 'merge-success') {
      const r = 8 + k * 40
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#bbf7d0'
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8
        const d = 6 + k * 34
        ctx.beginPath()
        ctx.arc(fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d, 2.5 * (1 - k) + 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      const s2 = 12
      ctx.beginPath()
      ctx.moveTo(fx.x - s2, fx.y - s2)
      ctx.lineTo(fx.x + s2, fx.y + s2)
      ctx.moveTo(fx.x + s2, fx.y - s2)
      ctx.lineTo(fx.x - s2, fx.y + s2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(fx.x, fx.y, 8 + k * 14, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    if (age >= EFFECT_MS) {
      effectStart.delete(fx.id)
      props.engine.removeEffect(fx.id)
    }
  }

  // 건설 커서(셀 스냅) — 마우스 배치 모드만
  if (hover.value && (props.buildMode === 'common' || props.buildMode === 'hero')) {
    const cell = snapToGrid(hover.value)
    const ok = props.engine.canPlaceAt(hover.value)
    ctx.fillStyle = ok ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.28)'
    ctx.fillRect(cell.x - half, cell.y - half, GRID.size, GRID.size)
    ctx.strokeStyle = ok ? '#22c55e' : '#ef4444'
    ctx.lineWidth = 2
    ctx.strokeRect(cell.x - half + 1, cell.y - half + 1, GRID.size - 2, GRID.size - 2)
  }

  raf = requestAnimationFrame(draw)
}

let ro: ResizeObserver | null = null
onMounted(() => {
  resize()
  fitView()
  ro = new ResizeObserver(() => {
    resize()
    fitView()
  })
  if (wrapRef.value) ro.observe(wrapRef.value)
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
})

defineExpose({ zoomIn: () => zoomButton(1.25), zoomOut: () => zoomButton(1 / 1.25), fit: fitView })
</script>

<template>
  <div ref="wrapRef" class="field-wrap">
    <canvas
      ref="canvasRef"
      class="field"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="hover = null"
      @wheel="onWheel"
    />
    <div class="zoom">
      <button @click="zoomButton(1.25)">＋</button>
      <button @click="zoomButton(1 / 1.25)">－</button>
      <button class="fitb" @click="fitView">⊡</button>
    </div>
  </div>
</template>

<style scoped>
.field-wrap {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #060a14;
}
.field {
  display: block;
  touch-action: none; /* 브라우저 기본 스크롤/줌 차단 → 직접 제스처 처리 */
  cursor: grab;
}
.field:active {
  cursor: grabbing;
}
.zoom {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 3;
}
.zoom button {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid #1f2d45;
  background: rgba(17, 26, 46, 0.85);
  color: #e2e8f0;
  font-size: 18px;
  cursor: pointer;
}
.zoom .fitb {
  font-size: 15px;
}
</style>

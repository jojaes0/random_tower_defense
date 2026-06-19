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
const hover = ref<Vec2 | null>(null)
let raf = 0

const fmtHp = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : `${Math.round(n)}`)
const raceColor = (r: string) => (r === 'terran' ? '#3b82f6' : r === 'protoss' ? '#f59e0b' : '#a855f7')
const raceShort = (r: string) => (r === 'terran' ? 'T' : r === 'protoss' ? 'P' : 'Z')

const toCanvasCoord = (e: MouseEvent): Vec2 => {
  const c = canvasRef.value!
  const rect = c.getBoundingClientRect()
  return {
    x: ((e.clientX - rect.left) / rect.width) * FIELD.width,
    y: ((e.clientY - rect.top) / rect.height) * FIELD.height,
  }
}

const onMove = (e: MouseEvent) => (hover.value = toCanvasCoord(e))

const onClick = (e: MouseEvent) => {
  const pos = toCanvasCoord(e)
  if (props.buildMode === 'common') return void props.engine.buildCommonTower(pos)
  if (props.buildMode === 'hero' && props.heroId) return void props.engine.buildHeroTower(props.heroId, pos)
  const hit = props.engine.state.towers.find((t) => Math.hypot(t.pos.x - pos.x, t.pos.y - pos.y) <= GRID.size / 2)
  if (props.buildMode === 'merge') {
    // 합성 모드: 타워 클릭 → 같은 종류 짝이 있으면 합성, 없으면 선택만(짝 강조)
    if (!hit) return void props.engine.selectTower(null)
    props.engine.selectTower(hit.uid)
    if (props.engine.mergePartner(hit.uid)) props.engine.mergeTower(hit.uid)
    return
  }
  props.engine.selectTower(hit ? hit.uid : null)
}

const draw = () => {
  const c = canvasRef.value
  if (!c) return
  const ctx = c.getContext('2d')!
  const s = props.engine.state
  ctx.clearRect(0, 0, FIELD.width, FIELD.height)
  ctx.fillStyle = '#0b1220'
  ctx.fillRect(0, 0, FIELD.width, FIELD.height)

  // 설치 칸(방) — 배경보다 살짝만 밝게(어둡게 유지) + 옅은 테두리
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
  // 입구(좌상단)·출구(중앙)
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

  // 선택 타워 사거리
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

  // 타워(캐릭터 모델: 등급색 박스 + 종족 테두리 + 아이콘 + 이름)
  ctx.textAlign = 'center'
  for (const t of s.towers) {
    const bp = t.blueprint
    const isSel = sel?.uid === t.uid
    const isPartner = partner?.uid === t.uid
    const bx = t.pos.x
    const by = t.pos.y
    const r = 16
    // 박스 배경(등급색, 어둡게)
    ctx.fillStyle = bp.color
    ctx.globalAlpha = 0.22
    roundRect(ctx, bx - r, by - r, r * 2, r * 2, 6)
    ctx.fill()
    ctx.globalAlpha = 1
    // 종족 테두리
    ctx.strokeStyle = isSel ? '#ffffff' : isPartner ? '#22d3ee' : raceColor(bp.race)
    ctx.lineWidth = isSel || isPartner ? 3 : 2
    roundRect(ctx, bx - r, by - r, r * 2, r * 2, 6)
    ctx.stroke()
    // 아이콘
    ctx.font = '17px "Segoe UI Emoji", sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.fillText(bp.icon, bx, by - 1)
    // 종족 약자(좌상단 작은 배지)
    ctx.font = 'bold 8px sans-serif'
    ctx.fillStyle = raceColor(bp.race)
    ctx.fillText(raceShort(bp.race), bx - r + 4, by - r + 4)
    // 이름 라벨
    ctx.font = '8px sans-serif'
    ctx.textBaseline = 'top'
    const label = bp.name
    const lw = ctx.measureText(label).width + 6
    ctx.fillStyle = 'rgba(2,6,16,0.78)'
    roundRect(ctx, bx - lw / 2, by + r - 1, lw, 11, 3)
    ctx.fill()
    ctx.fillStyle = bp.color
    ctx.fillText(label, bx, by + r)
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
    // 보스·미션 몹은 HP 숫자 표시
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

  // 건설 커서(셀 스냅) — 배치 모드에서만
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

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

onMounted(() => (raf = requestAnimationFrame(draw)))
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="FIELD.width"
    :height="FIELD.height"
    class="field"
    :class="{ building: buildMode !== 'idle' }"
    @click="onClick"
    @mousemove="onMove"
    @mouseleave="hover = null"
  />
</template>

<style scoped>
.field {
  /* 필드 영역에 맞춰 종횡비 유지하며 축소(요소 박스 = 렌더 영역 → 클릭 좌표 정확) */
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  display: block;
  border-radius: 10px;
  border: 1px solid #1f2d45;
  background: #0b1220;
}
.field.building {
  cursor: crosshair;
}
</style>

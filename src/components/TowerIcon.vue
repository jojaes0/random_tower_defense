<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { TowerBlueprint } from '@/engine/types'
import { drawEmblem } from './glyph'

const props = defineProps<{ bp: TowerBlueprint; size?: number }>()
const cv = ref<HTMLCanvasElement | null>(null)

const draw = () => {
  const c = cv.value
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const S = props.size ?? 30
  c.width = S * dpr
  c.height = S * dpr
  c.style.width = S + 'px'
  c.style.height = S + 'px'
  const ctx = c.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, S, S)
  drawEmblem(ctx, props.bp, S / 2, S / 2, S / 2 - 2)
}

onMounted(draw)
watch(() => [props.bp?.id, props.size], draw)
</script>

<template>
  <canvas ref="cv" class="ticon" />
</template>

<style scoped>
.ticon { display: block; }
</style>

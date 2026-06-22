<script setup lang="ts">
// 하단바 버튼용 라인 아이콘(이모지 대체). currentColor라 버튼 색/활성/비활성에 자동으로 맞춰진다.
defineProps<{ name: 'tower' | 'merge' | 'gas' | 'upgrade' | 'menu' | 'sell' }>()
</script>

<template>
  <svg
    class="bico"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- 일반 타워: 포탑(받침+돔+포신) -->
    <template v-if="name === 'tower'">
      <path d="M7 21h10" />
      <path d="M8 21v-7h8v7" />
      <path d="M9 14v-2a3 3 0 0 1 6 0v2" />
      <path d="M15 11l5-2.5" />
    </template>
    <!-- 합성 모드: 작은 두 조각 → 위로 합쳐진 큰 조각(승급 화살표) -->
    <template v-else-if="name === 'merge'">
      <rect x="3.5" y="14.5" width="6" height="6" rx="1.2" />
      <rect x="14.5" y="14.5" width="6" height="6" rx="1.2" />
      <path d="M7 14.5l5-5 5 5" />
      <rect x="8.5" y="3.5" width="7" height="7" rx="1.4" />
    </template>
    <!-- 가스 도박: 주사위(도박) -->
    <template v-else-if="name === 'gas'">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    </template>
    <!-- 업그레이드: 위 화살표 + 받침 바 -->
    <template v-else-if="name === 'upgrade'">
      <path d="M12 4l6 6" />
      <path d="M12 4l-6 6" />
      <path d="M12 4v10" />
      <path d="M6 20h12" />
    </template>
    <!-- 판매: 가격표(태그) -->
    <template v-else-if="name === 'sell'">
      <path d="M13.5 3.5H20a0.5 0.5 0 0 1 0.5 0.5v6.5a2 2 0 0 1-0.6 1.4l-7.5 7.5a2 2 0 0 1-2.8 0l-5.5-5.5a2 2 0 0 1 0-2.8l7.5-7.5a2 2 0 0 1 1.4-0.6z" />
      <circle cx="16.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </template>
    <!-- 메뉴: 햄버거 -->
    <template v-else>
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
    </template>
  </svg>
</template>

<style scoped>
.bico {
  width: 18px;
  height: 18px;
  display: block;
}
</style>

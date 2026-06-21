<script setup lang="ts">
// 하단바 버튼용 라인 아이콘(이모지 대체). currentColor라 버튼 색/활성/비활성에 자동으로 맞춰진다.
defineProps<{ name: 'tower' | 'merge' | 'gas' | 'upgrade' | 'menu' }>()
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
    <!-- 합성 모드: 두 갈래가 하나로 모이는 머지 -->
    <template v-else-if="name === 'merge'">
      <path d="M5 5l6 6" />
      <path d="M5 19l6-6" />
      <path d="M11 12h8" />
      <path d="M16 9l3 3-3 3" />
    </template>
    <!-- 가스 도박: 플라스크 + 기포 -->
    <template v-else-if="name === 'gas'">
      <path d="M9 3h6" />
      <path d="M10 3v5l-4.2 8a2 2 0 0 0 1.8 3h8.8a2 2 0 0 0 1.8-3L14 8V3" />
      <path d="M7.5 15.5h9" />
      <circle cx="11" cy="13.4" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="13.8" cy="17.2" r="0.7" fill="currentColor" stroke="none" />
    </template>
    <!-- 업그레이드: 위 화살표 + 받침 바 -->
    <template v-else-if="name === 'upgrade'">
      <path d="M12 4l6 6" />
      <path d="M12 4l-6 6" />
      <path d="M12 4v10" />
      <path d="M6 20h12" />
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

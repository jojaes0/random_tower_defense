<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GameField from '@/components/GameField.vue'
import TowerIcon from '@/components/TowerIcon.vue'
import { useGame } from '@/composables/useGame'
import { BALANCE, DIFFICULTIES, RARITY_META } from '@/engine/balance'
import { HERO_TOWERS, LEGEND_TOWERS, QUESTS, RACES } from '@/engine/content'
import type { RaceId } from '@/engine/types'

const { engine, state, speed, setSpeed, togglePause, resume } = useGame()

const buildMode = ref<'idle' | 'common' | 'hero' | 'legend' | 'merge'>('idle')
const heroId = ref<string | null>(null)
const legendId = ref<string | null>(null)
const showMenu = ref(false)
const tab = ref<'mission' | 'terrazine' | 'quest'>('mission')
const upgOpen = ref(false)

const setCommon = () => {
  buildMode.value = buildMode.value === 'common' ? 'idle' : 'common'
  heroId.value = legendId.value = null
}
const setMerge = () => {
  buildMode.value = buildMode.value === 'merge' ? 'idle' : 'merge'
  heroId.value = legendId.value = null
}
const selectHero = (id: string) => {
  if (buildMode.value === 'hero' && heroId.value === id) {
    buildMode.value = 'idle'
    heroId.value = null
  } else {
    buildMode.value = 'hero'
    heroId.value = id
    legendId.value = null
    showMenu.value = false
  }
}
// 영웅/전설 선택권으로 1기 설치 완료 → 모드 해제(연속 설치 방지)
const onPick = () => {
  buildMode.value = 'idle'
  heroId.value = legendId.value = null
}
const selectLegend = (id: string) => {
  if (buildMode.value === 'legend' && legendId.value === id) {
    buildMode.value = 'idle'
    legendId.value = null
  } else {
    buildMode.value = 'legend'
    legendId.value = id
    heroId.value = null
    showMenu.value = false
  }
}

const scheduled = new Set<number>()
watch(
  () => state.notifications.map((n) => n.id).join(','),
  () => {
    for (const n of state.notifications) {
      if (scheduled.has(n.id)) continue
      scheduled.add(n.id)
      setTimeout(() => {
        engine.dismissNotification(n.id)
        scheduled.delete(n.id)
      }, 4200)
    }
  },
)

// 하단 즉시 안내(notice) 자동 제거
const scheduledNotice = new Set<number>()
watch(
  () => state.notices.map((n) => n.id).join(','),
  () => {
    for (const n of state.notices) {
      if (scheduledNotice.has(n.id)) continue
      scheduledNotice.add(n.id)
      setTimeout(() => {
        engine.dismissNotice(n.id)
        scheduledNotice.delete(n.id)
      }, 2200)
    }
  },
)

watch(
  () => [state.minerals, state.terrazine, state.legendPicks, buildMode.value],
  () => {
    if (buildMode.value === 'common' && state.minerals < BALANCE.towerCost) buildMode.value = 'idle'
    if (buildMode.value === 'hero' && (state.minerals < BALANCE.heroPickMineralCost || state.terrazine < 1)) {
      buildMode.value = 'idle'
      heroId.value = null
    }
    if (buildMode.value === 'legend' && state.legendPicks < 1) {
      buildMode.value = 'idle'
      legendId.value = null
    }
  },
)

// 체력 손실 표시(붉은 플래시 + 떠오르는 -N)
const lifeFlash = ref(0)
const lifeMsgs = ref<{ id: number; amount: number }[]>([])
let lifeMsgId = 0
watch(
  () => state.life,
  (now, prev) => {
    if (now < prev && state.round >= 1) {
      lifeFlash.value++
      const id = ++lifeMsgId
      lifeMsgs.value.push({ id, amount: prev - now })
      setTimeout(() => (lifeMsgs.value = lifeMsgs.value.filter((m) => m.id !== id)), 1300)
    }
  },
)

const nextRoundLabel = computed(() => {
  const next = state.round + 1
  if (!state.endless && next > BALANCE.totalRounds) return '완료'
  if (!state.autoStarted) return `R${next} 시작${next % BALANCE.bossEvery === 0 ? ' ☠' : ''}`
  return '지금 시작' // 카운트다운은 버튼 아래(start-cd)에서 표시
})
const canStart = computed(() => state.phase === 'building' && (state.endless || state.round < BALANCE.totalRounds))
const start = () => {
  buildMode.value = 'idle'
  resume() // 일시정지면 직전 배속으로 복귀
  engine.startNextRound()
}

const sel = computed(() => engine.selectedTower)
const selStats = computed(() => (sel.value ? engine.effectiveStats(sel.value.blueprint, sel.value.dmgBonusMul) : null))
const sellConfirm = ref(false)
const sellAmount = computed(() => (sel.value ? engine.sellAmount(sel.value.blueprint.rarity) : 0))
const doSell = () => {
  if (sel.value) engine.sellTower(sel.value.uid)
  sellConfirm.value = false
}

const upgPct = (race: RaceId) => +(state.upgrades[race] * BALANCE.upgradeBonusPerLevel * 100).toFixed(1)
const raceNames = (races: RaceId[]) => races.map((r) => RACES.find((x) => x.id === r)?.name).join('·')
const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
const roundLabel = computed(() => (state.endless ? `${state.round} ∞` : `${state.round}/${BALANCE.totalRounds}`))
const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : `${Math.round(n)}`)
const preview = computed(() => engine.nextRoundPreview())

const menuAlert = computed(() => {
  const canMission = state.missions.some((m) => !m.active && m.cooldownRemaining <= 0)
  return canMission || state.terrazine >= 1
})
// 하단 팝오버 — 한 번에 하나만
const toggleUpg = () => {
  upgOpen.value = !upgOpen.value
  if (upgOpen.value) showMenu.value = false
}
const toggleMenu = () => {
  showMenu.value = !showMenu.value
  if (showMenu.value) upgOpen.value = false
}
</script>

<template>
  <div class="app">
    <!-- 전체화면 맵 (배경) -->
    <GameField :engine="engine" :build-mode="buildMode" :hero-id="heroId" :legend-id="legendId" @pick="onPick" />

    <!-- 체력 손실 플래시 -->
    <div v-if="lifeFlash" :key="lifeFlash" class="life-vignette"></div>
    <div class="life-msgs">
      <div v-for="m in lifeMsgs" :key="m.id" class="life-msg">−{{ m.amount }} ♥</div>
    </div>

    <!-- 보상/달성 토스트 -->
    <TransitionGroup name="toast" tag="div" class="toasts">
      <div v-for="n in state.notifications" :key="n.id" class="toast" :class="n.kind">
        <div class="toast-title">{{ n.kind === 'quest' ? '🏆' : n.kind === 'boss' ? '☠️' : n.kind === 'round' ? '⚔️' : '🎯' }} {{ n.title }}</div>
        <div class="toast-detail">{{ n.detail }}</div>
      </div>
    </TransitionGroup>

    <!-- 하단 즉시 안내(합성 결과·실패·미션 준비) -->
    <TransitionGroup name="notice" tag="div" class="notices">
      <div v-for="n in state.notices" :key="n.id" class="notice" :class="n.kind">{{ n.text }}</div>
    </TransitionGroup>

    <!-- 상단바 (오버레이) : 라운드·시간·배속 / 시작 -->
    <header class="topbar">
      <div class="tl">
        <div class="chip"><span>R</span><b>{{ roundLabel }}</b></div>
        <div class="chip"><span>⏱</span><b class="time">{{ mmss(state.elapsed) }}</b></div>
        <div class="speed">
          <button :class="{ on: speed === 0 }" aria-label="일시정지" @click="togglePause"><span class="pause-ico"></span></button>
          <button :class="{ on: speed === 1 }" @click="setSpeed(1)">1</button>
          <button :class="{ on: speed === 2 }" @click="setSpeed(2)">2</button>
          <button :class="{ on: speed === 3 }" @click="setSpeed(3)">3</button>
        </div>
      </div>
      <div class="start-wrap">
        <button class="start" :disabled="!canStart" @click="start">{{ state.phase === 'wave' ? '진행중' : nextRoundLabel }}</button>
        <span v-if="state.autoStarted && state.phase === 'building' && state.nextRoundCountdown > 0" class="start-cd">{{ Math.ceil(state.nextRoundCountdown) }}s 후 자동</span>
      </div>
    </header>

    <!-- 자원 스탯 (별도 줄, 순서: 미네랄·가스·체력) -->
    <div class="statbar">
      <div class="chip mineral"><span>미네랄</span><b>{{ state.minerals }}</b></div>
      <div class="chip gas"><span>가스</span><b>{{ state.gas }}</b></div>
      <div class="chip life"><span>♥</span><b>{{ state.life }}</b></div>
      <div class="chip terra"><span>◆</span><b>{{ state.terrazine }}</b></div>
      <div class="chip kill"><span>킬</span><b>{{ state.killCount }}</b></div>
    </div>

    <!-- 메시지(상태) + 다음 라운드 미리보기 (오버레이, 세로 스택 — 항상 각자 줄) -->
    <div class="msgbar">
      <span class="message">{{ state.message }}</span>
      <span v-if="preview && state.phase === 'building'" class="preview" :class="{ boss: preview.type === 'boss' }">
        다음 R{{ preview.round }}: <template v-if="preview.type === 'boss'">☠️</template><template v-else>잡몹×{{ preview.count }}</template> HP<b>{{ fmt(preview.hp) }}</b>
        <span v-if="preview.round === BALANCE.totalRounds && !state.endless" class="final-warn">⚠️못 막으면 패배</span>
      </span>
    </div>

    <!-- 선택 타워 정보 (우상단 오버레이) -->
    <aside v-if="sel && selStats" class="inspector-ov">
      <div class="ins-name" :style="{ color: sel.blueprint.color }">
        <TowerIcon :bp="sel.blueprint" :size="26" />{{ sel.blueprint.name }}
        <span class="badge" :style="{ background: RARITY_META[sel.blueprint.rarity].color }">{{ RARITY_META[sel.blueprint.rarity].label }}</span>
        <button class="ins-close" @click="engine.selectTower(null)">✕</button>
      </div>
      <div class="ins-sub">{{ raceNames(sel.blueprint.races) }}{{ sel.blueprint.races.length > 1 ? ' (혼합)' : '' }}{{ sel.blueprint.hits > 1 ? ' · ' + sel.blueprint.hits + '연사' : '' }}</div>
      <p v-if="sel.blueprint.skillDesc" class="skill">✦ {{ sel.blueprint.skillDesc }}<span v-if="sel.dmgBonusMul > 1"> ×{{ sel.dmgBonusMul.toFixed(0) }}</span></p>
      <ul class="ins-stats">
        <li><span>DPS</span><b>{{ (selStats.damage * selStats.attackSpeed * sel.blueprint.hits).toFixed(0) }}</b></li>
        <li><span>사거리</span><b>{{ selStats.range.toFixed(0) }}</b></li>
        <li><span>범위</span><b>{{ selStats.splashRadius > 0 ? selStats.splashRadius.toFixed(0) : '단일' }}</b></li>
        <li><span>보스</span><b>×{{ selStats.bonusVsBoss.toFixed(1) }}</b></li>
      </ul>
      <button class="sell" @click="sellConfirm = true">판매 +{{ sellAmount }}</button>
    </aside>

    <!-- 판매 확인 -->
    <div v-if="sellConfirm && sel" class="overlay" @click.self="sellConfirm = false">
      <div class="modal sell-modal">
        <h2>판매하시겠어요?</h2>
        <p>{{ sel.blueprint.name }} <span class="muted">({{ RARITY_META[sel.blueprint.rarity].label }})</span> 판매 시 <b style="color: #67e8f9">+{{ sellAmount }} 미네랄</b></p>
        <div class="modal-actions row">
          <button class="reset" @click="sellConfirm = false">취소</button>
          <button class="sell-yes" @click="doSell">판매</button>
        </div>
      </div>
    </div>

    <!-- 하단 바: 일반/합성/가스/업그레이드/메뉴 (업그레이드·메뉴는 각 버튼 위로 펼침) -->
    <div class="bottombar">
      <button class="bbtn" :class="{ active: buildMode === 'common' }" :disabled="state.minerals < BALANCE.towerCost" @click="setCommon"><i>🎲</i><span>일반 타워</span></button>
      <button class="bbtn" :class="{ active: buildMode === 'merge' }" @click="setMerge"><i>⚙</i><span>합성 모드</span></button>
      <button class="bbtn" :disabled="state.minerals < BALANCE.gasExchangeCost" @click="engine.gambleGas()"><i>⛽</i><span>가스 도박</span></button>

      <div class="bbtn-slot">
        <div v-if="upgOpen" class="upg-pop">
          <div class="dock-label">업그레이드 <span class="muted">가스 {{ state.gas }}</span></div>
          <button v-for="r in RACES" :key="r.id" class="upgb" :disabled="state.gas < engine.upgradeCost(r.id)" @click="engine.buyUpgrade(r.id)">
            <span class="upgb-r" :style="{ color: r.color }">{{ r.short }}</span>
            <span class="upgb-lv">Lv.{{ state.upgrades[r.id] }} · +{{ upgPct(r.id) }}%</span>
            <span class="upgb-cost">▲{{ engine.upgradeCost(r.id) }}</span>
          </button>
        </div>
        <button class="bbtn" :class="{ active: upgOpen }" @click="toggleUpg"><i>⬆</i><span>업그레이드</span></button>
      </div>

      <div class="bbtn-slot">
        <div v-if="showMenu" class="menu-pop">
        <div class="drawer-tabs">
          <button :class="{ on: tab === 'mission' }" @click="tab = 'mission'">개인미션</button>
          <button :class="{ on: tab === 'terrazine' }" @click="tab = 'terrazine'">테라진</button>
          <button :class="{ on: tab === 'quest' }" @click="tab = 'quest'">퀘스트</button>
        </div>
        <div class="drawer-body">
          <div v-if="tab === 'mission'">
            <p class="d-help">보스몹을 소환해 처치하면 미네랄 보상. 출구로 빠지면 목숨 -1.</p>
            <button v-for="m in state.missions" :key="m.id" class="mission-btn" :disabled="m.active || m.cooldownRemaining > 0 || state.phase === 'select-difficulty'" @click="engine.triggerMission(m.id)">
              <b>[{{ m.key }}] {{ m.name }}</b>
              <small v-if="m.active">진행 중…</small>
              <small v-else-if="m.cooldownRemaining > 0">쿨다운 {{ Math.ceil(m.cooldownRemaining) }}s</small>
              <small v-else>+{{ m.reward }} 미네랄 (클리어 {{ m.clears }})</small>
            </button>
          </div>
          <div v-if="tab === 'terrazine'">
            <p class="d-help">보유 테라진 ◆ {{ state.terrazine }} — 보스/퀘스트로 획득.</p>
            <button class="mini wide" :disabled="state.terrazine < 1" @click="engine.terrazineToMinerals()">→ 미네랄 +{{ BALANCE.terrazineToMinerals }} (◆1)</button>
            <button class="mini wide" :disabled="state.terrazine < 1" @click="engine.terrazineToGas()">→ 가스 +{{ BALANCE.terrazineToGas }} (◆1)</button>
            <p class="d-help" style="margin-top: 12px">영웅 선택권 — ◆1 + {{ BALANCE.heroPickMineralCost }}원 (선택 후 맵 탭)</p>
            <div class="hero-grid">
              <button v-for="h in HERO_TOWERS" :key="h.id" class="hero-btn" :class="{ active: heroId === h.id }" :disabled="state.terrazine < 1 || state.minerals < BALANCE.heroPickMineralCost" @click="selectHero(h.id)"><TowerIcon :bp="h" :size="20" /><span>{{ h.name }}</span></button>
            </div>
            <p class="d-help" style="margin-top: 12px">전설 확정 선택권 — 보유 <b style="color:#fb923c">{{ state.legendPicks }}</b> (퀘스트 보상 · 무료, 선택 후 맵 탭)</p>
            <div class="hero-grid">
              <button v-for="l in LEGEND_TOWERS" :key="l.id" class="hero-btn legend" :class="{ active: legendId === l.id }" :disabled="state.legendPicks < 1" @click="selectLegend(l.id)"><TowerIcon :bp="l" :size="20" /><span>{{ l.name }}</span></button>
            </div>
          </div>
          <div v-if="tab === 'quest'">
            <ul class="quest-list">
              <li v-for="q in QUESTS" :key="q.id" :class="{ done: state.questsDone[q.id] }">
                <div class="q-top"><b>{{ q.name }}</b><span class="q-prog">{{ state.questsDone[q.id] ? '✔' : engine.questProgress(q.id) }}</span></div>
                <div class="q-reward">{{ q.desc }} · {{ q.reward }}</div>
              </li>
            </ul>
          </div>
        </div>
        </div>
        <button class="bbtn" :class="{ active: showMenu, alert: menuAlert }" @click="toggleMenu"><i>☰</i><span>메뉴</span></button>
      </div>
    </div>

    <!-- 난이도 선택 -->
    <div v-if="state.phase === 'select-difficulty'" class="overlay">
      <div class="modal">
        <h2>난이도 선택</h2>
        <p class="muted">쉬움 → 지옥 순으로 어려워집니다(적 체력↑). 어려움이 실제 랜타디 표준 체력이고, 쉬움·보통은 그보다 체력이 적습니다.</p>
        <div class="diff-grid">
          <button v-for="d in DIFFICULTIES" :key="d.id" class="diff-card" @click="engine.chooseDifficulty(d.id)"><b>{{ d.name }}</b><p>{{ d.desc }}</p></button>
        </div>
      </div>
    </div>

    <!-- 승패 -->
    <div v-if="state.phase === 'won' || state.phase === 'lost'" class="overlay">
      <div class="modal">
        <h2 :class="state.phase">{{ state.phase === 'won' ? '🎉 50라운드 클리어!' : `💀 라운드 ${state.round} 패배` }}</h2>
        <p>{{ state.message }}</p>
        <p class="muted">킬 {{ state.killCount }} · 테라진 {{ state.terrazine }} · 시간 {{ mmss(state.elapsed) }}</p>
        <div class="modal-actions">
          <button v-if="state.phase === 'won'" class="start" @click="engine.continueEndless()">♾ 무한모드 계속 (+◆{{ BALANCE.endlessTerrazineGrant }})</button>
          <button class="reset" @click="engine.reset()">다시 시작</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app { position: relative; height: 100dvh; width: 100%; overflow: hidden; background: #060a14; }

/* 체력 손실 플래시 */
.life-vignette { position: fixed; inset: 0; z-index: 35; pointer-events: none; box-shadow: inset 0 0 90px 24px rgba(239, 68, 68, 0.75); animation: lifeflash 0.55s ease-out forwards; }
@keyframes lifeflash { from { opacity: 1; } to { opacity: 0; } }
.life-msgs { position: fixed; top: 88px; left: 50%; transform: translateX(-50%); z-index: 36; pointer-events: none; display: flex; flex-direction: column; gap: 2px; align-items: center; }
.life-msg { color: #ef4444; font-weight: 800; font-size: 24px; text-shadow: 0 2px 6px #000, 0 0 10px rgba(239, 68, 68, 0.6); animation: lifeup 1.3s ease-out forwards; }
@keyframes lifeup { 0% { opacity: 0; transform: translateY(12px) scale(0.8); } 15% { opacity: 1; transform: translateY(0) scale(1.15); } 100% { opacity: 0; transform: translateY(-34px); } }

/* 하단 즉시 안내(스타크래프트 시스템 메시지 식) — 하단 바 위 중앙 */
.notices { position: fixed; bottom: 112px; left: 50%; transform: translateX(-50%); z-index: 41; display: flex; flex-direction: column; gap: 5px; align-items: center; pointer-events: none; width: max-content; max-width: 92vw; }
.notice { padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; text-align: center; white-space: nowrap; background: rgba(8, 13, 24, 0.92); border: 1px solid #334155; color: #e2e8f0; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45); }
.notice.error { color: #fca5a5; border-color: #b91c1c; }
.notice.success { color: #86efac; border-color: #15803d; }
.notice.info { color: #93c5fd; border-color: #1d4ed8; }
.notice-enter-active { transition: all 0.25s cubic-bezier(0.2, 1.4, 0.4, 1); }
.notice-leave-active { transition: all 0.3s ease; position: absolute; }
.notice-enter-from { opacity: 0; transform: translateY(14px) scale(0.92); }
.notice-leave-to { opacity: 0; transform: translateY(-8px); }

/* 토스트 */
.toasts { position: fixed; top: 108px; left: 50%; transform: translateX(-50%); z-index: 40; display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; width: max-content; max-width: 92vw; }
.toast { min-width: 230px; max-width: 92vw; padding: 10px 16px; border-radius: 10px; border: 1px solid; background: rgba(14, 22, 38, 0.95); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); text-align: center; }
.toast.quest { border-color: #fbbf24; }
.toast.boss { border-color: #ef4444; }
.toast.mission { border-color: #f97316; }
.toast.round { border-color: #38bdf8; }
.toast-title { font-weight: 800; font-size: 14px; }
.toast.quest .toast-title { color: #fcd34d; }
.toast.boss .toast-title { color: #fca5a5; }
.toast.mission .toast-title { color: #fdba74; }
.toast.round .toast-title { color: #7dd3fc; }
.toast-detail { font-size: 12px; color: #cbd5e1; margin-top: 3px; }
.toast-enter-active { transition: all 0.35s cubic-bezier(0.2, 1.4, 0.4, 1); }
.toast-leave-active { transition: all 0.4s ease; position: absolute; }
.toast-enter-from { opacity: 0; transform: translateY(-18px) scale(0.9); }
.toast-leave-to { opacity: 0; transform: translateY(-14px); }
.toast-move { transition: transform 0.3s ease; }

/* 상단바 오버레이 */
.topbar { position: absolute; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; }
.tl { display: flex; align-items: center; gap: 6px; min-width: 0; overflow-x: auto; }
.bar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.menu-btn { position: relative; width: 36px; height: 32px; background: rgba(11, 18, 32, 0.92); border: 1px solid #1f2d45; border-radius: 7px; color: #e2e8f0; font-size: 16px; cursor: pointer; flex-shrink: 0; }
.menu-btn.alert::after { content: ''; position: absolute; top: 4px; right: 4px; width: 7px; height: 7px; background: #22c55e; border-radius: 50%; }
/* 자원 스탯 줄 */
.statbar { position: absolute; top: 44px; left: 8px; right: 8px; z-index: 9; display: flex; gap: 5px; overflow-x: auto; }
.chip { display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(11, 18, 32, 0.92); border-radius: 7px; border: 1px solid #1f2d45; white-space: nowrap; flex-shrink: 0; }
.chip span { font-size: 10px; color: #8aa0c0; }
.chip b { font-size: 13px; }
/* 시간: 자릿수가 바뀌어도 너비 고정(00:00 기준, 등폭 숫자) */
.chip b.time { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; display: inline-block; min-width: 5ch; text-align: center; }
.chip.life b { color: #ef4444; }
.chip.mineral b { color: #67e8f9; }
.chip.gas b { color: #86efac; }
.chip.terra b { color: #fbbf24; }
.speed { display: flex; gap: 3px; }
.speed button { display: flex; align-items: center; justify-content: center; width: 28px; height: 30px; background: #0b1220; border: 1px solid #1f2d45; border-radius: 6px; color: #cbd5e1; cursor: pointer; font-size: 12px; padding: 0; }
.speed button.on { background: #2563eb; border-color: #2563eb; color: #fff; }
/* 일시정지 아이콘 — 두 막대로 그려 박스 정중앙에 배치 */
.pause-ico { position: relative; display: inline-block; width: 9px; height: 11px; }
.pause-ico::before, .pause-ico::after { content: ''; position: absolute; top: 0; width: 3px; height: 11px; background: currentColor; border-radius: 1px; }
.pause-ico::before { left: 0; }
.pause-ico::after { right: 0; }
.start-wrap { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.start { padding: 8px 12px; font-weight: 700; font-size: 13px; background: #2563eb; border: none; border-radius: 7px; color: #fff; cursor: pointer; white-space: nowrap; }
.start:disabled { background: #334155; color: #94a3b8; cursor: not-allowed; }
.start-cd { font-size: 10px; color: #93c5fd; font-variant-numeric: tabular-nums; white-space: nowrap; }

/* 메시지/미리보기 오버레이 */
.msgbar { position: absolute; top: 74px; left: 8px; right: 8px; z-index: 8; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; pointer-events: none; }
.message { color: #93c5fd; font-size: 12px; background: rgba(11, 18, 32, 0.75); padding: 2px 8px; border-radius: 6px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview { font-size: 12px; color: #cbd5e1; background: rgba(11, 18, 32, 0.9); border: 1px solid #1f2d45; border-radius: 7px; padding: 2px 8px; white-space: nowrap; }
.preview b { color: #fca5a5; margin-left: 2px; }
.preview.boss { border-color: #7f1d1d; }
.preview .cd { margin-left: 6px; color: #fbbf24; }
.preview .final-warn { margin-left: 6px; color: #f87171; font-weight: 700; }

/* 선택 타워 정보 (우상단 오버레이) */
.inspector-ov { position: absolute; top: 104px; right: 8px; z-index: 9; width: 190px; max-width: 62vw; background: rgba(14, 22, 38, 0.95); border: 1px solid #1f2d45; border-radius: 10px; padding: 10px; }
.ins-name { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.ins-icon { font-size: 17px; }
.ins-close { margin-left: auto; width: 20px; height: 20px; background: #0b1220; border: 1px solid #1f2d45; border-radius: 5px; color: #94a3b8; cursor: pointer; font-size: 11px; }
.badge { font-size: 10px; color: #0b1220; padding: 1px 5px; border-radius: 5px; font-weight: 700; }
.ins-sub { font-size: 11px; color: #94a3b8; margin-top: 3px; }
.skill { font-size: 11px; color: #fbbf24; margin: 6px 0 0; }
.ins-stats { list-style: none; padding: 0; margin: 8px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; }
.ins-stats li { display: flex; justify-content: space-between; font-size: 12px; }
.ins-stats span { color: #8aa0c0; }
.sell { width: 100%; padding: 7px; background: #7f1d1d; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 12px; }

/* 하단 바 */
.bottombar { position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 9; display: flex; gap: 6px; }
.bbtn { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 1px; background: rgba(11, 18, 32, 0.95); border: 1px solid #1f2d45; border-radius: 10px; color: #e2e8f0; cursor: pointer; }
.bbtn i { font-style: normal; font-size: 16px; line-height: 1; }
.bbtn span { font-size: 10px; white-space: nowrap; }
.bbtn.active { border-color: #60a5fa; background: #15233f; }
.bbtn:disabled { opacity: 0.45; cursor: not-allowed; }
.bbtn.alert::after { content: ''; position: absolute; top: 4px; right: 6px; width: 7px; height: 7px; background: #22c55e; border-radius: 50%; }
/* 버튼 슬롯(팝오버를 해당 버튼 위에 고정) */
.bbtn-slot { position: relative; flex: 1; display: flex; }
.bbtn-slot .bbtn { flex: 1; }

/* 업그레이드 위로 펼침(업그레이드 버튼 기준, 고정 너비) */
.upg-pop { position: absolute; right: 0; bottom: calc(100% + 6px); width: 240px; max-width: 94vw; background: rgba(11, 18, 32, 0.97); border: 1px solid #1f2d45; border-radius: 10px; padding: 8px; display: flex; flex-direction: column; gap: 5px; }
.dock-label { font-size: 11px; color: #cbd5e1; display: flex; justify-content: space-between; }
.muted { color: #64748b; font-weight: 400; }
.upgb { display: flex; align-items: center; gap: 6px; padding: 8px 9px; background: #0b1220; border: 1px solid #1f2d45; border-radius: 7px; color: #e2e8f0; cursor: pointer; font-size: 12px; }
.upgb-r { font-weight: 700; width: 14px; }
.upgb-lv { flex: 1; color: #cbd5e1; }
.upgb-cost { color: #86efac; }
.upgb:disabled { opacity: 0.4; cursor: not-allowed; }

/* 메뉴 팝오버(메뉴 버튼 기준, 고정 너비) */
.menu-pop { position: absolute; right: 0; bottom: calc(100% + 6px); width: 300px; max-width: 94vw; max-height: 62vh; background: rgba(11, 18, 32, 0.97); border: 1px solid #1f2d45; border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; }
.drawer-tabs { display: flex; gap: 4px; padding: 8px; overflow-x: auto; flex-shrink: 0; }
.drawer-tabs button { flex-shrink: 0; padding: 7px 10px; background: #0b1220; border: 1px solid #1f2d45; border-radius: 7px; color: #cbd5e1; cursor: pointer; font-size: 12px; white-space: nowrap; }
.drawer-tabs button.on { background: #2563eb; border-color: #2563eb; color: #fff; }
.drawer-body { padding: 12px; overflow-y: auto; }
.d-help { font-size: 11px; color: #8aa0c0; margin: 0 0 10px; line-height: 1.5; }
.mini { padding: 8px 10px; background: #0b1220; border: 1px solid #1f2d45; border-radius: 6px; color: #e2e8f0; cursor: pointer; font-size: 12px; }
.mini.wide { width: 100%; margin-top: 6px; text-align: left; }
.mini:disabled { opacity: 0.4; cursor: not-allowed; }
.mission-btn { width: 100%; text-align: left; padding: 10px; margin-bottom: 6px; background: #0b1220; border: 1px solid #7c2d12; border-radius: 7px; color: #e2e8f0; cursor: pointer; font-size: 13px; }
.mission-btn small { display: block; color: #fb923c; font-size: 11px; margin-top: 2px; }
.mission-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.hero-btn { display: flex; align-items: center; gap: 6px; padding: 7px 6px; background: #0b1220; border: 1px solid #5b21b6; border-radius: 7px; color: #e2e8f0; cursor: pointer; font-size: 12px; text-align: left; }
.hero-btn canvas { flex-shrink: 0; }
.hero-btn.active { background: #4c1d95; border-color: #a855f7; }
.hero-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.hero-btn.legend { border-color: #c2410c; }
.hero-btn.legend.active { background: #7c2d12; border-color: #f97316; }
.quest-list { list-style: none; padding: 0; margin: 0; }
.quest-list li { padding: 8px 0; border-top: 1px solid #1f2d45; }
.quest-list li.done { opacity: 0.5; }
.q-top { display: flex; justify-content: space-between; font-size: 13px; }
.q-prog { color: #86efac; }
.q-reward { font-size: 11px; color: #8aa0c0; }

/* 오버레이(모달) */
.overlay { position: fixed; inset: 0; background: rgba(2, 6, 16, 0.85); display: flex; align-items: center; justify-content: center; z-index: 30; padding: 12px; }
.modal { background: #111a2e; border: 1px solid #1f2d45; border-radius: 14px; padding: 22px 24px; text-align: center; max-width: 560px; width: 100%; }
.modal h2 { margin-top: 0; }
.modal h2.won { color: #22c55e; }
.modal h2.lost { color: #ef4444; }
.diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.diff-card { padding: 14px 12px; background: #0b1220; border: 2px solid #1f2d45; border-radius: 12px; cursor: pointer; color: #e2e8f0; text-align: left; }
.diff-card:hover { border-color: #2563eb; }
.diff-card b { font-size: 15px; }
.diff-card p { font-size: 12px; color: #8aa0c0; margin: 6px 0 0; }
.modal-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.modal-actions.row { flex-direction: row; }
.modal-actions.row button { flex: 1; }
.reset { padding: 10px; background: #334155; border: none; border-radius: 8px; color: #e2e8f0; cursor: pointer; font-weight: 600; }
.sell-yes { padding: 10px; background: #7f1d1d; border: none; border-radius: 8px; color: #fff; cursor: pointer; font-weight: 700; }
.sell-modal { max-width: 380px; }
</style>

// 콘텐츠 — 3종족, 타워 풀(40여 종), 적, 퀘스트
// 신/전설 타워는 나무위키의 실제 DPS·사거리 수치를 반영했다.

import { BALANCE, RANGE_SCALE, RARITY_META } from './balance'
import type {
  EnemyBlueprint,
  PersonalMissionDef,
  Quest,
  Race,
  RaceId,
  Rarity,
  Role,
  SkillId,
  TowerBlueprint,
} from './types'

// ---------------------------------------------------------------------------
// 종족
// ---------------------------------------------------------------------------

// 종족 고유색(=타워 본체). 등급색(흰/파랑/보라/주황/초록)과 겹치지 않게: 테란 파랑 / 프로토스 노랑 / 저그 마젠타
export const RACES: Race[] = [
  { id: 'terran', name: '테란', short: 'T', color: '#3b82f6', tagline: '단일 고화력 — 보스에 강함' },
  { id: 'protoss', name: '프로토스', short: 'P', color: '#facc15', tagline: '광역·밸런스 — 보스/라인 무난' },
  { id: 'zerg', name: '저그', short: 'Z', color: '#ec4899', tagline: '라인 클리어 — 잡몹에 강함' },
]

export const RACE_BY_ID: Record<RaceId, Race> = {
  terran: RACES[0],
  protoss: RACES[1],
  zerg: RACES[2],
}

// ---------------------------------------------------------------------------
// 타워 정의 — {dps, interval(초), rangeUnit(게임거리), role} 로 간결하게 기술
// damage = round(dps * interval), attackSpeed = 1/interval
// ---------------------------------------------------------------------------

interface TowerDef {
  id: string
  name: string
  race: RaceId
  rarity: Rarity
  role: Role
  dps: number
  interval: number
  rangeUnit: number
  skill?: SkillId
  skillDesc?: string
}

// role → splash / 보스보너스 기본값
const roleSplash: Record<Role, number> = { line: 50, balance: 30, boss: 0 }
const roleBoss: Record<Role, number> = { line: 1.0, balance: 1.4, boss: 2.2 }

const DEFS: TowerDef[] = [
  // ── 일반(common) 8 ──────────────────────────────────────────────
  { id: 'marine', name: '해병', race: 'terran', rarity: 'common', role: 'line', dps: 180, interval: 0.4, rangeUnit: 6 },
  { id: 'vulture', name: '시체매', race: 'terran', rarity: 'common', role: 'line', dps: 120, interval: 0.5, rangeUnit: 6 },
  { id: 'wraith', name: '망령', race: 'terran', rarity: 'common', role: 'balance', dps: 110, interval: 0.6, rangeUnit: 6 },
  { id: 'roach', name: '바퀴', race: 'zerg', rarity: 'common', role: 'balance', dps: 130, interval: 0.5, rangeUnit: 6 },
  { id: 'mutalisk', name: '뮤탈리스크', race: 'zerg', rarity: 'common', role: 'line', dps: 160, interval: 0.5, rangeUnit: 6 },
  { id: 'zealot', name: '광전사', race: 'protoss', rarity: 'common', role: 'line', dps: 210, interval: 0.4, rangeUnit: 3 },
  { id: 'stalker', name: '추적자', race: 'protoss', rarity: 'common', role: 'boss', dps: 120, interval: 0.6, rangeUnit: 6 },
  { id: 'scout', name: '정찰기', race: 'protoss', rarity: 'common', role: 'balance', dps: 110, interval: 0.5, rangeUnit: 6 },

  // ── 희귀(rare) 8 ────────────────────────────────────────────────
  { id: 'firebat', name: '화염방사병', race: 'terran', rarity: 'rare', role: 'line', dps: 450, interval: 0.4, rangeUnit: 7 },
  { id: 'siege', name: '공성전차', race: 'terran', rarity: 'rare', role: 'boss', dps: 300, interval: 1.0, rangeUnit: 13 },
  { id: 'viking', name: '바이킹', race: 'terran', rarity: 'rare', role: 'balance', dps: 500, interval: 0.5, rangeUnit: 7 },
  { id: 'inf_marine', name: '감염된 해병', race: 'zerg', rarity: 'rare', role: 'line', dps: 350, interval: 0.5, rangeUnit: 7 },
  { id: 'infestor', name: '감염충', race: 'zerg', rarity: 'rare', role: 'balance', dps: 420, interval: 0.6, rangeUnit: 7 },
  { id: 'archon', name: '집정관', race: 'protoss', rarity: 'rare', role: 'balance', dps: 560, interval: 0.4, rangeUnit: 7 },
  { id: 'dark_templar', name: '암흑 기사', race: 'protoss', rarity: 'rare', role: 'line', dps: 700, interval: 0.3, rangeUnit: 3 },
  { id: 'phoenix', name: '불사조', race: 'protoss', rarity: 'rare', role: 'line', dps: 800, interval: 0.35, rangeUnit: 7 },

  // ── 영웅(hero) 8 ────────────────────────────────────────────────
  { id: 'goliath', name: '골리앗', race: 'terran', rarity: 'hero', role: 'boss', dps: 700, interval: 0.8, rangeUnit: 11 },
  { id: 'banshee', name: '밴시', race: 'terran', rarity: 'hero', role: 'line', dps: 1100, interval: 0.5, rangeUnit: 8 },
  { id: 'herc', name: '허크', race: 'terran', rarity: 'hero', role: 'line', dps: 1400, interval: 0.4, rangeUnit: 5 },
  { id: 'aberration', name: '파멸충', race: 'zerg', rarity: 'hero', role: 'boss', dps: 900, interval: 0.6, rangeUnit: 8 },
  { id: 'devourer', name: '포식귀', race: 'zerg', rarity: 'hero', role: 'line', dps: 700, interval: 0.6, rangeUnit: 8 },
  { id: 'arbiter', name: '중재자', race: 'protoss', rarity: 'hero', role: 'balance', dps: 1000, interval: 0.5, rangeUnit: 8 },
  { id: 'corsair', name: '해적선', race: 'protoss', rarity: 'hero', role: 'line', dps: 1100, interval: 0.4, rangeUnit: 8 },
  { id: 'dragoon', name: '용기병', race: 'protoss', rarity: 'hero', role: 'boss', dps: 1000, interval: 0.6, rangeUnit: 8 },

  // ── 전설(legend) 8 — 실제 DPS·사거리 ────────────────────────────
  { id: 'valkyrie', name: '발키리', race: 'terran', rarity: 'legend', role: 'line', dps: 1920, interval: 0.5, rangeUnit: 7.2 },
  { id: 'liberator', name: '해방선', race: 'terran', rarity: 'legend', role: 'line', dps: 1577, interval: 0.6, rangeUnit: 7.2 },
  { id: 'guardian', name: '수호군주', race: 'zerg', rarity: 'legend', role: 'line', dps: 666, interval: 0.6, rangeUnit: 10.8, skill: 'multi3', skillDesc: '한 번에 최대 3마리 타격' },
  { id: 'zergling_l', name: '저글링', race: 'zerg', rarity: 'legend', role: 'line', dps: 2070, interval: 0.3, rangeUnit: 6 },
  { id: 'hydra_l', name: '히드라리스크', race: 'zerg', rarity: 'legend', role: 'balance', dps: 1428, interval: 0.4, rangeUnit: 7.2 },
  { id: 'immortal', name: '불멸자', race: 'protoss', rarity: 'legend', role: 'boss', dps: 1670, interval: 0.5, rangeUnit: 7.2 },
  { id: 'destroyer', name: '파괴자', race: 'protoss', rarity: 'legend', role: 'line', dps: 1268, interval: 0.5, rangeUnit: 7.2 },
  { id: 'hybrid', name: '혼종', race: 'zerg', rarity: 'legend', role: 'balance', dps: 1680, interval: 0.5, rangeUnit: 9.6 },

  // ── 신(god) 9 — 실제 DPS·사거리 ─────────────────────────────────
  { id: 'lurker', name: '가시지옥', race: 'zerg', rarity: 'god', role: 'line', dps: 2812, interval: 0.5, rangeUnit: 10.8 },
  { id: 'ravager', name: '궤멸충', race: 'zerg', rarity: 'god', role: 'boss', dps: 5666, interval: 0.3, rangeUnit: 7.2 },
  { id: 'ultralisk', name: '울트라리스크', race: 'zerg', rarity: 'god', role: 'line', dps: 5000, interval: 0.35, rangeUnit: 5.4 },
  { id: 'high_templar', name: '고위 기사', race: 'protoss', rarity: 'god', role: 'line', dps: 3900, interval: 0.5, rangeUnit: 7.2, skill: 'multi3', skillDesc: '빠른 공속·스플래시 광역(라인 정리)' },
  { id: 'adept', name: '사도', race: 'protoss', rarity: 'god', role: 'balance', dps: 3857, interval: 0.7, rangeUnit: 8.4, skill: 'clone', skillDesc: '확률적 분신 → 공격력 누적 증가' },
  { id: 'carrier', name: '우주모함', race: 'protoss', rarity: 'god', role: 'line', dps: 2000, interval: 0.2, rangeUnit: 13.2 },
  { id: 'science', name: '과학선', race: 'terran', rarity: 'god', role: 'line', dps: 3375, interval: 0.8, rangeUnit: 7.2 },
  { id: 'marauder_g', name: '불곰', race: 'terran', rarity: 'god', role: 'boss', dps: 5000, interval: 0.5, rangeUnit: 7.2, skill: 'slow', skillDesc: '공격 시 대상 이동속도 감소' },
  { id: 'spectre', name: '악령', race: 'terran', rarity: 'god', role: 'balance', dps: 6000, interval: 0.3, rangeUnit: 10.8, skill: 'multi3', skillDesc: '한 번에 최대 3마리 타격' },
]

// 타워별 캐릭터 아이콘 — 무슨 유닛인지 한눈에 구분
const ICONS: Record<string, string> = {
  // 일반
  marine: '🔫', vulture: '🏍️', wraith: '🛩️', roach: '🐛',
  mutalisk: '🦇', zealot: '⚔️', stalker: '🕷️', scout: '✈️',
  // 희귀
  firebat: '🔥', siege: '💣', viking: '🚀', inf_marine: '🧟',
  infestor: '🪱', archon: '⚡', dark_templar: '🗡️', phoenix: '🔆',
  // 영웅
  goliath: '🤖', banshee: '🚁', herc: '🦾', aberration: '👹',
  devourer: '🦟', arbiter: '🔮', corsair: '🛸', dragoon: '🦿',
  // 전설
  valkyrie: '💫', liberator: '☄️', guardian: '🐉', zergling_l: '🐜',
  hydra_l: '🐍', immortal: '🔱', destroyer: '⚛️', hybrid: '👾',
  // 신
  lurker: '🌵', ravager: '🧨', ultralisk: '🦏', high_templar: '🌀',
  adept: '👤', carrier: '🛰️', science: '🔬', marauder_g: '🐻', spectre: '👻',
}

const buildBlueprint = (d: TowerDef): TowerBlueprint => ({
  id: d.id,
  name: d.name,
  race: d.race,
  rarity: d.rarity,
  role: d.role,
  damage: Math.round(d.dps * d.interval),
  attackSpeed: +(1 / d.interval).toFixed(2),
  range: Math.round(d.rangeUnit * RANGE_SCALE),
  splashRadius: roleSplash[d.role],
  bonusVsBoss: roleBoss[d.role],
  color: RARITY_META[d.rarity].color,
  icon: ICONS[d.id] ?? '⬢',
  skill: d.skill,
  skillDesc: d.skillDesc,
})

export const ALL_TOWERS: TowerBlueprint[] = DEFS.map(buildBlueprint)

export const TOWERS_BY_ID: Record<string, TowerBlueprint> = Object.fromEntries(
  ALL_TOWERS.map((t) => [t.id, t]),
)

/** 등급별 타워 풀 */
export const TOWERS_BY_RARITY: Record<Rarity, TowerBlueprint[]> = {
  common: ALL_TOWERS.filter((t) => t.rarity === 'common'),
  rare: ALL_TOWERS.filter((t) => t.rarity === 'rare'),
  hero: ALL_TOWERS.filter((t) => t.rarity === 'hero'),
  legend: ALL_TOWERS.filter((t) => t.rarity === 'legend'),
  god: ALL_TOWERS.filter((t) => t.rarity === 'god'),
}

export const HERO_TOWERS = TOWERS_BY_RARITY.hero

// ---------------------------------------------------------------------------
// 적
// ---------------------------------------------------------------------------

export const MOB_BLUEPRINT: EnemyBlueprint = {
  id: 'mob',
  name: '라인몹',
  isBoss: false,
  color: '#e2e8f0',
  radius: 9,
}

export const BOSS_BLUEPRINT: EnemyBlueprint = {
  id: 'boss',
  name: '보스',
  isBoss: true,
  color: '#ef4444',
  radius: 20,
}

// ---------------------------------------------------------------------------
// 퀘스트
// ---------------------------------------------------------------------------

export const QUESTS: Quest[] = [
  { id: 'collect_common', name: '모든 일반 유닛 수집', desc: '서로 다른 일반 8종 보유', reward: '광물 300' },
  { id: 'hero7', name: '영웅 유닛 7개 수집', desc: '영웅 등급 7개 건설', reward: '광물 300' },
  { id: 'legend6', name: '전설 유닛 6개 수집', desc: '전설 등급 6개 건설', reward: '광물 300' },
  { id: 'god5', name: '신 유닛 5개 수집', desc: '신 등급 5개 건설', reward: '광물 500' },
  { id: 'tri_god', name: '3종족 신 획득', desc: '테란·프로토스·저그 신 각 1', reward: '테라진 1' },
  { id: 'kill750', name: '누적 750킬', desc: '적 750마리 처치', reward: '테라진 2' },
  { id: 'time7', name: '7분 경과', desc: '게임 시작 7분', reward: '광물 200', timeThreshold: BALANCE.timeQuest7 },
  { id: 'time12', name: '12분 경과', desc: '게임 시작 12분', reward: '광물 300', timeThreshold: BALANCE.timeQuest12 },
  { id: 'time18', name: '18분 경과', desc: '게임 시작 18분', reward: '테라진 2', timeThreshold: BALANCE.timeQuest18 },
]

// ---------------------------------------------------------------------------
// 개인 미션 — 5분 쿨다운 보스몹 소환(본 구현은 빠른 진행에 맞춰 쿨다운 단축)
// ---------------------------------------------------------------------------

// 나무위키 기준 기본 체력(난이도 배율이 곱해짐) / 5분(300초) 쿨다운
export const PERSONAL_MISSIONS: PersonalMissionDef[] = [
  { id: 'pm_crab', key: 'A', name: '게', hp: 3000, reward: 100, cooldown: 300 },
  { id: 'pm_dark', key: 'S', name: '암흑 광전사', hp: 30000, reward: 200, cooldown: 300 },
  { id: 'pm_overlord', key: 'D', name: '대군주', hp: 175000, reward: 500, cooldown: 300 },
]

export const MISSION_BLUEPRINT: EnemyBlueprint = {
  id: 'mission',
  name: '개인미션',
  isBoss: false,
  color: '#f97316',
  radius: 16,
}

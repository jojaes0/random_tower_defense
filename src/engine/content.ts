// 콘텐츠 — 3종족, 타워 풀(44종: 일반8·희귀8·영웅8·전설8·신12), 적, 퀘스트
// 타워 스탯(DPS·공격속도·사거리)은 "뉴 랜타디 23" 인게임 데이터(사용자 제공) 기준.

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
// damage = round(dps * interval / hits), attackSpeed = 1/interval(=공격 주기 Period의 역수)
// SC2 정통 모델: 공격속도는 단일 개념(주기 Period). DPS = 발당피해 × (1/Period) × 연사(hits)
// ---------------------------------------------------------------------------

interface TowerDef {
  id: string
  name: string
  race: RaceId
  /** 혼종처럼 여러 종족 업그레이드를 받는 경우 지정(미지정 시 [race]) */
  races?: RaceId[]
  rarity: Rarity
  role: Role
  dps: number
  /** 공격 횟수(주기당 발사 수) */
  hits: number
  interval: number
  rangeUnit: number
  /** 범위 공격 반경(px). 없거나 0이면 단일. 유닛 특징 + 등급대비 DPS 고려해 임의 튜닝(나무위키 수치 없음) */
  splash?: number
  skill?: SkillId
  /** 스킬 발동 확률(0~1). 미지정 시 1 */
  skillChance?: number
  skillDesc?: string
  /** 보조 무기(예: 골리앗 미사일) — 본 무기와 동시 운용, 독립 스탯 */
  secondary?: { dps: number; interval: number; rangeUnit: number; splash?: number }
}

// role → 보스 추가피해(라인=대보스 약함, 보스=특화). 계수만 임의.
const roleBoss: Record<Role, number> = { line: 1.0, balance: 1.4, boss: 2.2 }

// 뉴 랜타디 23 인게임 데이터(사용자 제공). role/splash/보스보너스는 데이터에 없어 placeholder('balance').
// dps=공식 DPS, interval=공격속도(초), rangeUnit=사거리. damage=round(dps*interval), 공속=1/interval.
const DEFS: TowerDef[] = [
  // ── 일반(common) 8 ── (role/aoe = 나무위키 서술)
  { id: 'scv', name: '건설 로봇', race: 'terran', rarity: 'common', role: 'balance', dps: 41.6, hits: 1, interval: 1.2, rangeUnit: 7 },
  { id: 'trooper', name: '부대원', race: 'terran', rarity: 'common', role: 'line', dps: 26, hits: 1, interval: 0.69, rangeUnit: 6 },
  { id: 'reaper', name: '사신', race: 'protoss', rarity: 'common', role: 'line', dps: 16, hits: 2, interval: 0.88, rangeUnit: 6 },
  { id: 'fanatic', name: '광신자', race: 'protoss', rarity: 'common', role: 'line', dps: 45, hits: 1, interval: 1, rangeUnit: 7 },
  { id: 'stalker', name: '추적자', race: 'protoss', rarity: 'common', role: 'balance', dps: 40, hits: 1, interval: 1.15, rangeUnit: 7 },
  { id: 'gargoyle', name: '갈귀', race: 'zerg', rarity: 'common', role: 'line', dps: 27.3, hits: 1, interval: 0.83, rangeUnit: 7 },
  { id: 'overlord', name: '대군주', race: 'zerg', rarity: 'common', role: 'balance', dps: 23.4, hits: 1, interval: 0.68, rangeUnit: 7 },
  { id: 'zergling', name: '저글링', race: 'zerg', rarity: 'common', role: 'line', dps: 22, hits: 1, interval: 0.56, rangeUnit: 5 },

  // ── 희귀(rare) 8 ────────────────────────────────────────────────
  { id: 'marauder_corps', name: '불곰 특공대', race: 'terran', rarity: 'rare', role: 'balance', dps: 81.9, hits: 1, interval: 1.2, rangeUnit: 7 },
  { id: 'cyclone', name: '사이클론', race: 'terran', rarity: 'rare', role: 'balance', dps: 20.8, hits: 1, interval: 0.25, rangeUnit: 7 },
  { id: 'ghost', name: '유령', race: 'terran', rarity: 'rare', role: 'boss', dps: 75, hits: 1, interval: 1.12, rangeUnit: 8 },
  { id: 'zealot', name: '광전사', race: 'protoss', rarity: 'rare', role: 'line', dps: 39, hits: 2, interval: 0.96, rangeUnit: 5 },
  { id: 'dragoon', name: '용기병', race: 'protoss', rarity: 'rare', role: 'balance', dps: 99, hits: 1, interval: 1.44, rangeUnit: 1.7 },
  { id: 'warp_prism', name: '전쟁 분광기', race: 'protoss', rarity: 'rare', role: 'balance', dps: 70, hits: 1, interval: 1.04, rangeUnit: 8 },
  { id: 'roach', name: '바퀴', race: 'zerg', rarity: 'rare', role: 'balance', dps: 115, hits: 1, interval: 1.6, rangeUnit: 6 },
  { id: 'hydralisk', name: '히드라리스크', race: 'zerg', rarity: 'rare', role: 'balance', dps: 55, hits: 1, interval: 0.83, rangeUnit: 7.2 },

  // ── 영웅(hero) 8 ── (뉴 랜타디 23: 영웅부터 고유 스킬 보유)
  // 골리앗: 기관포(본 무기, 보통 사거리·위력·빠른 공속) + 미사일(보조, 강한 위력·긴 사거리·느린 공속) 동시 운용.
  // 총 DPS ≈ 156(기관포 96 + 미사일 60)으로 인게임 표기치 유지.
  { id: 'goliath', name: '골리앗', race: 'terran', rarity: 'hero', role: 'balance', dps: 96, hits: 1, interval: 0.6, rangeUnit: 9, skillDesc: '기관포(연사) + 미사일(강력·장거리·저속) 동시 운용', secondary: { dps: 60, interval: 3, rangeUnit: 12 } },
  { id: 'thor', name: '토르', race: 'terran', rarity: 'hero', role: 'boss', dps: 137, hits: 2, interval: 1.1, rangeUnit: 7.2, skill: 'slow', skillChance: 0.4, skillDesc: '250mm 타격포 — 단일 대상 50% 감속' },
  { id: 'ascendant', name: '승천자', race: 'protoss', rarity: 'hero', role: 'boss', dps: 208, hits: 1, interval: 1.6, rangeUnit: 7.2, skillDesc: '정신 폭발 — 강력한 단일 공격' },
  { id: 'executor', name: '젤나가 집행자', race: 'protoss', rarity: 'hero', role: 'balance', dps: 273, hits: 1, interval: 1.45, rangeUnit: 7.2, splash: 38, skill: 'stun', skillChance: 0.25, skillDesc: '확률적 좁은 범위 기절' },
  { id: 'reaver', name: '파괴자', race: 'protoss', rarity: 'hero', role: 'line', dps: 247, hits: 1, interval: 1.8, rangeUnit: 7.2, skill: 'multi3', skillChance: 0.4, skillDesc: '확률적 갑충탄 다중 타격' },
  { id: 'swarm_host', name: '군단 숙주', race: 'zerg', rarity: 'hero', role: 'line', dps: 52, hits: 1, interval: 2.5, rangeUnit: 7.2, skill: 'summon', skillDesc: '식충 4마리 소환 — 맵을 돌며 적 공격(본체는 약함)' },
  { id: 'queen', name: '여왕', race: 'zerg', rarity: 'hero', role: 'balance', dps: 364, hits: 1, interval: 1.5, rangeUnit: 9, splash: 50, skill: 'slow', skillChance: 0.3, skillDesc: '인스네어 — 범위 확률 감속' },
  { id: 'primal_igniter', name: '원시 점화자', race: 'zerg', rarity: 'hero', role: 'line', dps: 195, hits: 1, interval: 1, rangeUnit: 6, splash: 58, skillDesc: '화염방사 — 범위 공격' },

  // ── 전설(legend) 8 ──────────────────────────────────────────────
  { id: 'valerius', name: '발리우스', race: 'terran', rarity: 'legend', role: 'line', dps: 527, hits: 1, interval: 1, rangeUnit: 7.2, splash: 48, skillDesc: '일직선 포격 — 범위 피해' },
  { id: 'warfield', name: '워필드', race: 'terran', rarity: 'legend', role: 'line', dps: 585, hits: 1, interval: 1.04, rangeUnit: 7.2, splash: 42, skillDesc: '십자 모양 좁은 범위 피해' },
  { id: 'mojo', name: '모조', race: 'protoss', rarity: 'legend', role: 'boss', dps: 1200, hits: 1, interval: 1.2, rangeUnit: 7.2, skillDesc: '스킬 없음 — 높은 단일 DPS' },
  { id: 'mohandar', name: '모한다르', race: 'protoss', rarity: 'legend', role: 'boss', dps: 128, hits: 1, interval: 1, rangeUnit: 11, skill: 'charge', skillDesc: '3단 충전(공허 포격기) — 연속 공격 시 피해 증가' },
  { id: 'urun', name: '우룬', race: 'protoss', rarity: 'legend', role: 'line', dps: 273, hits: 2, interval: 0.8, rangeUnit: 7.2, splash: 54, skillDesc: '과부하 — 주변 범위 난사' },
  { id: 'zagara', name: '자가라', race: 'zerg', rarity: 'legend', role: 'line', dps: 292, hits: 1, interval: 1.35, rangeUnit: 7, splash: 50, skillDesc: '맹독충 투하 — 방사 피해' },
  { id: 'torrasque', name: '토라스크', race: 'zerg', rarity: 'legend', role: 'line', dps: 325, hits: 1, interval: 0.5, rangeUnit: 7, splash: 54, skillDesc: '기본 공격이 범위 피해' },
  { id: 'mecha_ravager', name: '메카 궤멸충', race: 'terran', races: ['terran', 'zerg'], rarity: 'legend', role: 'line', dps: 858, hits: 1, interval: 1.3, rangeUnit: 7.2, skill: 'multi3', skillChance: 1, skillDesc: '담즙 난사 — 여러 개체 타격' },

  // ── 신(god) 12 ── (뉴 랜타디 23 기준 고유 스킬)
  { id: 'sam', name: '사기꾼 샘', race: 'terran', rarity: 'god', role: 'line', dps: 1650, hits: 2, interval: 0.88, rangeUnit: 7.2, skill: 'bomb', skillChance: 0.05, skillDesc: '사신 2연사 + 5% 확률 폭탄 6발 난사(광역)', secondary: { dps: 280, interval: 7, rangeUnit: 9, splash: 64 } },
  { id: 'tauren_marine', name: '타우렌 우주 해병', race: 'terran', rarity: 'god', role: 'line', dps: 1900, hits: 1, interval: 0.6, rangeUnit: 7.2, splash: 44, skill: 'slow', skillChance: 0.4, skillDesc: '충격파 — 일직선 감속' },
  { id: 'duke', name: '듀크', race: 'terran', rarity: 'god', role: 'balance', dps: 2300, hits: 1, interval: 1, rangeUnit: 10, splash: 52, skill: 'mode', skillChance: 0.2, skillDesc: '20% 확률 5초 대체모드(빠른공속/범위/강력)' },
  { id: 'rasagal', name: '라자갈', race: 'protoss', rarity: 'god', role: 'balance', dps: 1250, hits: 1, interval: 0.27, rangeUnit: 7.2, splash: 44, skill: 'slow', skillChance: 0.5, skillDesc: '분열망 — 범위 약화/감속' },
  { id: 'malash', name: '말라쉬', race: 'protoss', rarity: 'god', role: 'balance', dps: 2400, hits: 1, interval: 0.7, rangeUnit: 7.2, splash: 50, skill: 'slow', skillChance: 0.15, skillDesc: '파괴의 숨결 — 범위 감속' },
  { id: 'vorazun', name: '보라준', race: 'protoss', rarity: 'god', role: 'line', dps: 1550, hits: 1, interval: 0.95, rangeUnit: 7.2, skill: 'multi3', skillChance: 0.5, skillDesc: '그림자 격노 — 여러 대상 연속 공격' },
  { id: 'impaler', name: '추적 도살자', race: 'zerg', rarity: 'god', role: 'balance', dps: 2700, hits: 1, interval: 0.7, rangeUnit: 7.2, skill: 'multi3', skillChance: 0.33, skillDesc: '33% 확률 주변 3마리 타격' },
  { id: 'sliven', name: '슬리반', race: 'zerg', rarity: 'god', role: 'line', dps: 1000, hits: 1, interval: 1.35, rangeUnit: 7.2, splash: 62, skillDesc: '산성 포자 — 광역(궤멸충 상위호환)' },
  { id: 'mobius_hybrid', name: '뫼비우스 혼종', race: 'terran', races: ['terran', 'protoss', 'zerg'], rarity: 'god', role: 'balance', dps: 1400, hits: 1, interval: 1.25, rangeUnit: 10, splash: 50, skill: 'slow', skillChance: 1, skillDesc: '십자 폭발 + 이속 감소' },
  { id: 'raynor', name: '레이너', race: 'terran', rarity: 'god', role: 'balance', dps: 3800, hits: 1, interval: 0.6, rangeUnit: 7.2, skillDesc: '스킬 없음 — 순수 깡딜' },
  { id: 'zeratul', name: '제라툴', race: 'protoss', rarity: 'god', role: 'balance', dps: 2650, hits: 1, interval: 0.95, rangeUnit: 7.2, skill: 'multi3', skillChance: 0.25, skillDesc: '가르기 — 25% 확률 반원 광역' },
  { id: 'kukulza', name: '쿠쿨자', race: 'zerg', rarity: 'god', role: 'line', dps: 3500, hits: 1, interval: 1, rangeUnit: 7.2, skill: 'multi3', skillChance: 1, skillDesc: '쐐기 벌레 — 최대 3마리 튕김' },
]

// 타워별 캐릭터 아이콘 — 무슨 유닛인지 한눈에 구분
const ICONS: Record<string, string> = {
  // 일반
  scv: '🔧', trooper: '🪖', reaper: '🪂', fanatic: '⚔️', stalker: '🕷️', gargoyle: '🦇', overlord: '🎈', zergling: '🐜',
  // 희귀
  marauder_corps: '🐻', cyclone: '🌀', ghost: '👻', zealot: '🗡️', dragoon: '🦿', warp_prism: '🛸', roach: '🐛', hydralisk: '🐍',
  // 영웅
  goliath: '🤖', thor: '🦾', ascendant: '🔮', executor: '⚡', reaver: '⚛️', swarm_host: '🦗', queen: '👑', primal_igniter: '🔥',
  // 전설
  valerius: '🎯', warfield: '🎖️', mojo: '🛩️', mohandar: '🔱', urun: '🌌', zagara: '🧫', torrasque: '🦏', mecha_ravager: '🧨',
  // 신
  sam: '💣', tauren_marine: '🐂', duke: '🛡️', rasagal: '🛰️', malash: '🐲', vorazun: '🌒', impaler: '🩸', sliven: '🧪',
  mobius_hybrid: '👾', raynor: '🔫', zeratul: '✴️', kukulza: '🦅',
}

const buildBlueprint = (d: TowerDef): TowerBlueprint => ({
  id: d.id,
  name: d.name,
  race: d.race,
  races: d.races ?? [d.race],
  rarity: d.rarity,
  role: d.role,
  // 발당 피해 = DPS × 공격속도 ÷ 공격횟수 (주기당 hits발 발사 → 총합이 DPS 유지)
  damage: Math.round((d.dps * d.interval) / d.hits),
  hits: d.hits,
  attackSpeed: 1 / d.interval, // 전체 정밀도(반올림 금지) → 쿨다운=interval, DPS 표시 정확
  // 근접 유닛은 인접 라인에 닿도록 최소 사거리(약 1.3칸) 보장
  range: d.rangeUnit <= 5 ? Math.max(Math.round(d.rangeUnit * RANGE_SCALE), 62) : Math.round(d.rangeUnit * RANGE_SCALE),
  splashRadius: d.splash ?? 0,
  bonusVsBoss: roleBoss[d.role],
  color: RARITY_META[d.rarity].color,
  icon: ICONS[d.id] ?? '⬢',
  melee: d.rangeUnit <= 5, // 사거리 작은 유닛 = 근접
  skill: d.skill,
  skillChance: d.skillChance,
  skillDesc: d.skillDesc,
  secondary: d.secondary && {
    damage: Math.round(d.secondary.dps * d.secondary.interval),
    attackSpeed: 1 / d.secondary.interval,
    range: Math.round(d.secondary.rangeUnit * RANGE_SCALE),
    splashRadius: d.secondary.splash ?? 0,
    bonusVsBoss: roleBoss[d.role],
  },
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

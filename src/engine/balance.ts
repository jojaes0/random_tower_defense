// 밸런스 상수 — 난이도/경제는 이 파일에서 조정한다.

import type { Difficulty, Rarity } from './types'

export const BALANCE = {
  totalRounds: 50,
  bossEvery: 10,

  // 시작 자원
  startMinerals: 300,

  // 경제
  rewardPerRound: 300,
  towerCost: 100,
  sellRatio: 0.5,
  gasExchangeCost: 100,

  // 가스 도박: 20~120, 10단위
  gasGambleMin: 20,
  gasGambleMax: 120,
  gasGambleStep: 10,

  // 업그레이드: 종족별 공격력 단리 증가
  upgradeMaxLevel: 100,
  upgradeBonusPerLevel: 0.125, // 레벨당 공격력 +12.5%(단리)
  upgradeBaseCost: 20, // 시작 비용 20 가스
  upgradeCostPerLevel: 2, // 단계별 추가 가스 +2(나무위키 2017 패치 5→2)

  // 테라진
  terrazinePerBoss: 1,
  killMilestone: 750,
  terrazineKillReward: 2,
  terrazineTriRaceGod: 1,
  terrazineToMinerals: 400,
  terrazineToGas: 300,
  heroPickMineralCost: 100,
  endlessTerrazineGrant: 222, // 50R 클리어 시 무한모드 진입 보상

  // 관통 시 생명 손실
  lifeLossPerLeak: 1,
  lifeLossPerBossLeak: 10,
  lifeLossPerMissionLeak: 1, // 뉴버전 기준 개인 미션 실패 시 -1

  // 적 — 체력은 roundHp.ts 실측 테이블 사용. 이동속도는 전 몹 공통.
  enemySpeedUnit: 4.5, // 모든 몹 이동속도 4.5(게임유닛) → px = 4.5 × RANGE_SCALE
  mobsPerRound: 20, // 라운드당 잡몹 20마리(보스 라운드는 보스 1마리)
  mobBounty: 0, // 처치당 미네랄 없음(라운드 클리어 300만)
  bossBounty: 0,

  spawnInterval: 0.5,
  roundInterval: 20, // 라운드 종료 후 자동 시작까지 대기(초). 배속에 따라 빨라짐

  // 스킬 파라미터
  cloneChance: 0.02, // 사도: 발당 분신 확률(나무위키 2%)
  cloneMaxStacks: 5, // 분신 누적 한도(추가 배율 상한)
  slowFactor: 0.5, // 불곰 감속 계수
  slowDuration: 1.5, // 감속 지속(초)
  stunDuration: 0.8, // 기절 지속(초)
  multiTargets: 3, // 다단히트 대상 수
  multiRadius: 80, // 다단히트 탐색 반경(px)

  // 시간 경과 퀘스트(초)
  timeQuest7: 7 * 60,
  timeQuest12: 12 * 60,
  timeQuest18: 18 * 60,
} as const

/** 난이도 */
// 어려움(500%)이 실제 랜타디 표준 체력. 보통·쉬움은 그 체력을 줄인 버전(80%·60%).
export const DIFFICULTIES: Difficulty[] = [
  { id: 'd300', name: '쉬움 (300%)', desc: '표준의 60% 체력 · 목숨 20 — 가장 쉬움', hpMult: 3, startLife: 20, startMineralBonus: 0, startGasBonus: 0 },
  { id: 'd400', name: '보통 (400%)', desc: '표준의 80% 체력 · 목숨 20', hpMult: 4, startLife: 20, startMineralBonus: 0, startGasBonus: 0 },
  { id: 'd500', name: '어려움 (500%)', desc: '표준 체력(실제 랜타디) · 목숨 20', hpMult: 5, startLife: 20, startMineralBonus: 0, startGasBonus: 0 },
  { id: 'hell', name: '지옥 (500% · 목숨5)', desc: '어려움과 같은 체력 · 목숨 5 + 보너스(미네랄200·가스100)', hpMult: 5, startLife: 5, startMineralBonus: 200, startGasBonus: 100 },
]

/** 게임유닛 사거리 → 픽셀 환산. 실제 SC2 비율: 건설 타일 1칸 = 2 게임유닛 → 사거리 1 = 0.5칸 */
export const RANGE_SCALE = 24

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'hero', 'legend', 'god']

export const nextRarity = (r: Rarity): Rarity | null => {
  const i = RARITY_ORDER.indexOf(r)
  return i >= 0 && i < RARITY_ORDER.length - 1 ? RARITY_ORDER[i + 1] : null
}

// 등급별 색(=타워 테두리). 사용자 지정: 일반 흰색 / 희귀 밝은파랑 / 영웅 보라 / 전설 주황 / 신 밝은초록
export const RARITY_META: Record<Rarity, { label: string; color: string }> = {
  common: { label: '일반', color: '#ffffff' },
  rare: { label: '희귀', color: '#38bdf8' },
  hero: { label: '영웅', color: '#a855f7' },
  legend: { label: '전설', color: '#f97316' },
  god: { label: '신', color: '#4ade80' },
}

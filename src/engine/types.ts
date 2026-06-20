// 게임 전역 타입 정의 (실제 RTD 구조 기준)

export type RaceId = 'terran' | 'protoss' | 'zerg'

/** 5등급: 일반 → 희귀 → 영웅 → 전설 → 신 */
export type Rarity = 'common' | 'rare' | 'hero' | 'legend' | 'god'

/** 타워 성향 — 라인(잡몹) / 보스 / 밸런스 */
export type Role = 'line' | 'boss' | 'balance'

/** 타워 시그니처 스킬 */
export type SkillId = 'clone' | 'slow' | 'multi3' | 'stun' | 'charge' | 'summon' | 'bomb' | 'mode' | 'malash'

/** 듀크 대체모드 종류 */
export type DukeMode = 'fast' | 'power' | 'aoe' | null

export type GamePhase = 'select-difficulty' | 'building' | 'wave' | 'won' | 'lost'

export interface Vec2 {
  x: number
  y: number
}

/** 난이도 */
export interface Difficulty {
  id: string
  name: string
  desc: string
  hpMult: number
  startLife: number
  startMineralBonus: number
  startGasBonus: number
}

/** 타워 원형(설계도) */
export interface TowerBlueprint {
  id: string
  name: string
  /** 대표 종족(표시·기본색용) */
  race: RaceId
  /** 업그레이드 적용 종족 목록(혼종은 여러 개 → 모두 합산 적용) */
  races: RaceId[]
  rarity: Rarity
  role: Role
  /** 발당 피해 */
  damage: number
  /** 주기당 발사 수(공격 횟수) — 여러 대상에 분산 타격 */
  hits: number
  /** 초당 공격 주기 수 */
  attackSpeed: number
  /** 사거리(px) */
  range: number
  /** 범위 반경(px). 0이면 단일 */
  splashRadius: number
  /** 보스 추가 피해 배율 */
  bonusVsBoss: number
  /** 표시 색(등급색) */
  color: string
  /** 캐릭터 아이콘(이모지, 폴백용) */
  icon: string
  /** 근접 유닛(사거리 작음) — 근접 공격 모션 */
  melee: boolean
  /** 시그니처 스킬 */
  skill?: SkillId
  /** 스킬 발동 확률(0~1). 미지정 시 1(상시 발동) */
  skillChance?: number
  /** splash가 확률 발동일 때의 확률(미지정 시 상시 광역) */
  splashChance?: number
  /** 감속 지속(초) 오버라이드(미지정 시 BALANCE.slowDuration) */
  slowDur?: number
  /** 감속 계수 오버라이드(0~1, 미지정 시 BALANCE.slowFactor) */
  slowFac?: number
  /** 받는 피해 증폭 계수(예: 1.2 = 20% 더 받음). 설정 시 발동마다 적에게 부여 */
  ampFac?: number
  /** 다중타격 2차 대상(주 대상 외) 피해 배율(쿠쿨자 쿠션 1/3 등) */
  multiMul?: number
  /** 스킬 설명(UI용) */
  skillDesc?: string
  /** 보조 무기(예: 골리앗 미사일) — 본 무기와 별개 쿨다운·사거리·위력으로 동시 운용 */
  secondary?: SecondaryWeapon
}

/** 보조 무기 — 독립적으로 발사되는 두 번째 무기 */
export interface SecondaryWeapon {
  damage: number
  attackSpeed: number
  range: number
  splashRadius: number
  bonusVsBoss: number
}

/** 맵에 배치된 타워 인스턴스 */
export interface Tower {
  uid: number
  blueprint: TowerBlueprint
  pos: Vec2
  cooldown: number
  /** 보조 무기(secondary)·소환(summon) 독립 쿨다운 */
  cooldown2: number
  /** 사도 분신 등으로 누적되는 추가 피해 배율(1=기본) */
  dmgBonusMul: number
  /** 듀크 대체모드 남은 시간(초) */
  modeTimer: number
  /** 듀크 대체모드 종류 */
  modeType: DukeMode
  /** 충전형(모한다르) 직전 대상 — 대상이 바뀌면 충전 초기화 */
  lastTargetUid: number
}

/** 소환 미니언(군단 숙주 식충 등) — 자율 이동하며 적을 공격 */
export interface Minion {
  uid: number
  ownerUid: number
  pos: Vec2
  damage: number
  range: number
  attackSpeed: number
  cooldown: number
  speed: number
  life: number
  color: string
  bonusVsBoss: number
}

export interface EnemyBlueprint {
  id: string
  name: string
  isBoss: boolean
  color: string
  radius: number
}

export interface Enemy {
  uid: number
  blueprint: EnemyBlueprint
  hp: number
  maxHp: number
  speed: number
  /** 진행 거리(px) */
  progress: number
  pos: Vec2
  isBoss: boolean
  /** 개인 미션 몹 여부 */
  isMission: boolean
  /** 개인 미션 몹이면 미션 id */
  missionId: string | null
  /** 이 적이 현재 라운드 종료를 막는가(라운드 중 생성=true, 대기 중 생성된 미션몹=false) */
  roundBound: boolean
  bounty: number
  /** 감속 남은 시간(초)·계수 */
  slowTimer: number
  slowFactor: number
  /** 기절 남은 시간(초) */
  stunTimer: number
  /** 받는 피해 증폭 남은 시간(초)·계수(1=기본) */
  ampTimer: number
  ampFactor: number
}

export interface Projectile {
  uid: number
  from: Vec2
  to: Vec2
  targetUid: number
  damage: number
  splashRadius: number
  bonusVsBoss: number
  color: string
  skill?: SkillId
  skillChance?: number
  splashChance?: number
  slowDur?: number
  slowFac?: number
  ampFac?: number
  multiMul?: number
  /** 근접 공격(슬래시) 여부 */
  melee: boolean
  /** 미사일(보조 무기) 여부 — 렌더 구분 */
  missile?: boolean
  /** 폭탄(샘 등) 여부 — 렌더 구분 */
  bomb?: boolean
  /** 등급 랭크(0=일반 … 4=신) — 화려함 스케일 */
  rank: number
  t: number
  speed: number
}

/** 종족 가스 업그레이드 트리 */
export interface Race {
  id: RaceId
  name: string
  short: string // T/P/Z
  color: string
  tagline: string
}

/** 퀘스트 정의 */
export interface Quest {
  id: string
  name: string
  desc: string
  reward: string
  /** 시간 경과형 퀘스트면 임계 초 */
  timeThreshold?: number
}

/** 개인 미션 정의 */
export interface PersonalMissionDef {
  id: string
  key: string // 단축키 표기
  name: string
  /** 기본 체력(나무위키 절대값) — 난이도 배율이 곱해진다 */
  hp: number
  reward: number
  cooldown: number
}

/** 런타임 개인 미션 상태 */
export interface PersonalMission extends PersonalMissionDef {
  cooldownRemaining: number
  active: boolean
  clears: number
}

/** 종족별 업그레이드 레벨 (raceId -> level) */
export type UpgradeLevels = Record<RaceId, number>

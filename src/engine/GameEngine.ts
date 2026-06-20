// 게임 엔진 — 실제 RTD 구조 + 난이도/클럭/개인미션/스킬/디버프/무한모드.
// (Vue 비의존 순수 로직)

import { BALANCE, DIFFICULTIES, RANGE_SCALE, RARITY_META, RARITY_ORDER, nextRarity } from './balance'
import {
  BOSS_BLUEPRINT,
  MISSION_BLUEPRINT,
  MOB_BLUEPRINT,
  PERSONAL_MISSIONS,
  QUESTS,
  RACE_BY_ID,
  TOWERS_BY_RARITY,
  TOWERS_BY_ID,
} from './content'
import { PATH_LENGTH, isBuildableCell, pointAtDistance, snapToGrid } from './path'
import { ROUND_HP_HELL, endlessHellHp } from './roundHp'
import type {
  Difficulty,
  DukeMode,
  Enemy,
  EnemyBlueprint,
  GamePhase,
  Minion,
  PersonalMission,
  Projectile,
  RaceId,
  Rarity,
  Tower,
  TowerBlueprint,
  UpgradeLevels,
  Vec2,
} from './types'

export interface GameState {
  phase: GamePhase
  difficulty: Difficulty | null
  round: number
  endless: boolean
  /** 첫 라운드를 수동으로 시작했는지(이후부터 자동 시작) */
  autoStarted: boolean
  /** 다음 라운드 자동 시작까지 남은 시간(초). 0이면 카운트 없음 */
  nextRoundCountdown: number
  elapsed: number // 초
  minerals: number
  gas: number
  terrazine: number
  life: number
  upgrades: UpgradeLevels
  towers: Tower[]
  enemies: Enemy[]
  projectiles: Projectile[]
  minions: Minion[]
  missions: PersonalMission[]
  selectedTowerUid: number | null
  killCount: number
  /** 전설 확정 선택 건설권 보유 수(퀘스트 보상) */
  legendPicks: number
  questsDone: Record<string, boolean>
  lastGasGamble: number | null
  notifications: GameNotification[]
  effects: GameEffect[]
  impacts: Impact[]
  message: string
  /** 말라쉬 창조의 숨결 — 아군 공격력 버프 남은 시간(초)·배율 */
  allyBuffTimer: number
  allyBuffMul: number
}

/** 피격 임팩트(공격 명중 위치 연출) */
export interface Impact {
  id: number
  x: number
  y: number
  fromX: number // 공격자 위치(근접 베기 모션용)
  fromY: number
  splash: number // 0이면 단일
  color: string
  rank: number
  melee: boolean
}

/** 합성 등 일시적 시각 효과 (GameField가 시간 기반으로 애니메이션 후 제거) */
export interface GameEffect {
  id: number
  x: number
  y: number
  kind: 'merge-success' | 'merge-fail'
}

/** 보상/달성 토스트 */
export interface GameNotification {
  id: number
  kind: 'quest' | 'boss' | 'mission' | 'round'
  title: string
  detail: string
}

const randItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export class GameEngine {
  state: GameState
  private uid = 1
  private spawnQueue: Enemy[] = []
  private spawnTimer = 0
  private onChange: () => void

  constructor(onChange: () => void) {
    this.onChange = onChange
    this.state = this.freshState()
  }

  private freshState = (): GameState => ({
    phase: 'select-difficulty',
    difficulty: null,
    round: 0,
    endless: false,
    autoStarted: false,
    nextRoundCountdown: 0,
    elapsed: 0,
    minerals: BALANCE.startMinerals,
    gas: 0,
    terrazine: 0,
    life: 20,
    upgrades: { terran: 0, protoss: 0, zerg: 0 },
    towers: [],
    enemies: [],
    projectiles: [],
    minions: [],
    missions: PERSONAL_MISSIONS.map((m) => ({ ...m, cooldownRemaining: 0, active: false, clears: 0 })),
    selectedTowerUid: null,
    killCount: 0,
    legendPicks: 0,
    questsDone: {},
    lastGasGamble: null,
    notifications: [],
    effects: [],
    impacts: [],
    message: '난이도를 선택하세요.',
    allyBuffTimer: 0,
    allyBuffMul: 1,
  })

  private addEffect = (pos: Vec2, kind: GameEffect['kind']): void => {
    this.state.effects.push({ id: this.nextUid(), x: pos.x, y: pos.y, kind })
    if (this.state.effects.length > 12) this.state.effects.shift()
  }

  /** GameField가 애니메이션 종료 후 호출 */
  removeEffect = (id: number): void => {
    const i = this.state.effects.findIndex((e) => e.id === id)
    if (i >= 0) this.state.effects.splice(i, 1)
  }

  private addImpact = (p: Projectile, x: number, y: number): void => {
    this.state.impacts.push({ id: this.nextUid(), x, y, fromX: p.from.x, fromY: p.from.y, splash: p.splashRadius, color: p.color, rank: p.rank, melee: p.melee })
    if (this.state.impacts.length > 80) this.state.impacts.shift()
  }

  removeImpact = (id: number): void => {
    const i = this.state.impacts.findIndex((e) => e.id === id)
    if (i >= 0) this.state.impacts.splice(i, 1)
  }

  private notify = (kind: GameNotification['kind'], title: string, detail: string): void => {
    this.state.notifications.push({ id: this.nextUid(), kind, title, detail })
    if (this.state.notifications.length > 4) this.state.notifications.shift()
  }

  /** Vue 레이어에서 일정 시간 후 토스트 제거 */
  dismissNotification = (id: number): void => {
    const i = this.state.notifications.findIndex((n) => n.id === id)
    if (i >= 0) this.state.notifications.splice(i, 1)
  }

  private nextUid = (): number => this.uid++

  // -------------------------------------------------------------------------
  // 시작 / 라운드
  // -------------------------------------------------------------------------

  chooseDifficulty = (id: string): void => {
    const d = DIFFICULTIES.find((x) => x.id === id)
    if (!d) return
    this.state.difficulty = d
    this.state.life = d.startLife
    this.state.minerals += d.startMineralBonus
    this.state.gas += d.startGasBonus
    this.state.phase = 'building'
    this.state.message = `${d.name} 시작! 일반 타워를 짓고 같은 종류 2개를 합성하세요.`
    this.onChange()
  }

  private isBossRound = (round: number): boolean => round % BALANCE.bossEvery === 0

  /** 다음 라운드 미리보기(잡몹 수·체력) — 라운드마다 체력이 오르는 걸 보여주기 위함 */
  nextRoundPreview = (): { round: number; type: 'mob' | 'boss'; count: number; hp: number } | null => {
    if (this.state.difficulty == null) return null
    const round = this.state.round + 1
    if (!this.state.endless && round > BALANCE.totalRounds) return null
    const hp = Math.round(this.roundMobHp(round)) // 테이블 값(보스 라운드면 보스 체력)
    if (this.isBossRound(round)) return { round, type: 'boss', count: 1, hp }
    return { round, type: 'mob', count: BALANCE.mobsPerRound, hp }
  }

  startNextRound = (): void => {
    if (this.state.phase !== 'building') return
    if (!this.state.endless && this.state.round >= BALANCE.totalRounds) return
    this.state.autoStarted = true // 첫 수동 시작 이후로는 자동 진행
    this.state.nextRoundCountdown = 0
    this.state.round++
    this.state.phase = 'wave'
    this.buildSpawnQueue(this.state.round)
    this.spawnTimer = 0
    this.state.message = `라운드 ${this.state.round} 시작!`
    const boss = this.isBossRound(this.state.round)
    this.notify('round', `라운드 ${this.state.round} 시작`, boss ? '⚠️ 보스 등장!' : `잡몹 ${BALANCE.mobsPerRound}마리`)
    this.onChange()
  }

  /** 라운드 체력(실측 테이블 × 난이도). 보스 라운드면 보스 1마리 총 체력, 그 외는 마리당 체력. */
  private roundMobHp = (round: number): number => {
    const hellHp = round <= 50 ? ROUND_HP_HELL[round - 1] : endlessHellHp(round)
    return hellHp * ((this.state.difficulty?.hpMult ?? 5) / 5) // 테이블은 어려움/지옥(=500%) 기준
  }

  private buildSpawnQueue = (round: number): void => {
    const queue: Enemy[] = []
    const hp = this.roundMobHp(round)
    const speed = BALANCE.enemySpeedUnit * RANGE_SCALE // 모든 몹 공통 4.5
    if (this.isBossRound(round)) {
      // 테이블 값이 곧 보스 체력 (이동속도도 동일 4.5)
      queue.push(this.makeEnemy(BOSS_BLUEPRINT, hp, speed, BALANCE.bossBounty, { isBoss: true }))
    } else {
      for (let i = 0; i < BALANCE.mobsPerRound; i++) queue.push(this.makeEnemy(MOB_BLUEPRINT, hp, speed, BALANCE.mobBounty, {}))
    }
    this.spawnQueue = queue
  }

  private makeEnemy = (
    bp: EnemyBlueprint,
    hp: number,
    speed: number,
    bounty: number,
    opts: { isBoss?: boolean; isMission?: boolean; missionId?: string; roundBound?: boolean },
  ): Enemy => ({
    uid: this.nextUid(),
    blueprint: bp,
    hp: Math.round(hp),
    maxHp: Math.round(hp),
    speed,
    progress: 0,
    pos: pointAtDistance(0),
    isBoss: opts.isBoss ?? false,
    isMission: opts.isMission ?? false,
    missionId: opts.missionId ?? null,
    roundBound: opts.roundBound ?? true,
    bounty,
    slowTimer: 0,
    slowFactor: 1,
    stunTimer: 0,
    ampTimer: 0,
    ampFactor: 1,
  })

  // -------------------------------------------------------------------------
  // 개인 미션
  // -------------------------------------------------------------------------

  triggerMission = (id: string): boolean => {
    if (this.state.phase === 'select-difficulty') return false
    const m = this.state.missions.find((x) => x.id === id)
    if (!m) return false
    if (m.active) return this.fail(`${m.name} 미션 진행 중입니다.`)
    if (m.cooldownRemaining > 0) return this.fail(`${m.name} 쿨다운 ${Math.ceil(m.cooldownRemaining)}초`)
    // 나무위키 기본 체력 × 난이도 배율(난이도에 따라 체력이 달라진다)
    const hp = m.hp * (this.state.difficulty?.hpMult ?? 1)
    const speed = BALANCE.enemySpeedUnit * RANGE_SCALE * (m.speedMul ?? 1)
    // 라운드 중(wave) 소환이면 라운드 종료를 막고, 대기 중(building) 소환이면 라운드와 별개로 진행
    const roundBound = this.state.phase === 'wave'
    this.state.enemies.push(this.makeEnemy(MISSION_BLUEPRINT, hp, speed, m.reward, { isMission: true, missionId: id, roundBound }))
    m.active = true
    m.cooldownRemaining = m.cooldown
    this.state.message = `개인 미션 [${m.key}] ${m.name} 소환!${roundBound ? '' : '(라운드와 별개)'} 처치 시 +${m.reward} 미네랄`
    this.onChange()
    return true
  }

  private endMission = (id: string | null, cleared: boolean): void => {
    if (!id) return
    const m = this.state.missions.find((x) => x.id === id)
    if (!m) return
    m.active = false
    if (cleared) m.clears++
  }

  // -------------------------------------------------------------------------
  // 건설 / 합성 / 판매
  // -------------------------------------------------------------------------

  /** 셀 점유 여부 */
  private cellOccupied = (cell: Vec2): boolean =>
    this.state.towers.some((t) => Math.abs(t.pos.x - cell.x) < 1 && Math.abs(t.pos.y - cell.y) < 1)

  /** 클릭 좌표가 건설 가능한지(그리드 스냅 기준) */
  canPlaceAt = (pos: Vec2): boolean => {
    const cell = snapToGrid(pos)
    return isBuildableCell(cell) && !this.cellOccupied(cell)
  }

  buildCommonTower = (pos: Vec2): boolean => {
    if (this.state.minerals < BALANCE.towerCost) return this.fail('미네랄이 부족합니다.')
    const cell = snapToGrid(pos)
    if (!isBuildableCell(cell)) return this.fail('여기에는 지을 수 없습니다.')
    if (this.cellOccupied(cell)) return this.fail('이미 타워가 있는 칸입니다.')
    this.state.minerals -= BALANCE.towerCost
    const bp = randItem(TOWERS_BY_RARITY.common)
    this.placeTower(bp, cell)
    this.state.message = `[일반] ${bp.name}(${RACE_BY_ID[bp.race].short}) 건설!`
    this.afterChange()
    return true
  }

  buildHeroTower = (blueprintId: string, pos: Vec2): boolean => {
    const bp = TOWERS_BY_ID[blueprintId]
    if (!bp || bp.rarity !== 'hero') return false
    if (this.state.terrazine < 1) return this.fail('테라진이 부족합니다.')
    if (this.state.minerals < BALANCE.heroPickMineralCost) return this.fail('미네랄이 부족합니다.')
    const cell = snapToGrid(pos)
    if (!isBuildableCell(cell)) return this.fail('여기에는 지을 수 없습니다.')
    if (this.cellOccupied(cell)) return this.fail('이미 타워가 있는 칸입니다.')
    this.state.terrazine -= 1
    this.state.minerals -= BALANCE.heroPickMineralCost
    this.placeTower(bp, cell)
    this.state.message = `[영웅] ${bp.name} 확정 건설!`
    this.afterChange()
    return true
  }

  buildLegendTower = (blueprintId: string, pos: Vec2): boolean => {
    const bp = TOWERS_BY_ID[blueprintId]
    if (!bp || bp.rarity !== 'legend') return false
    if (this.state.legendPicks < 1) return this.fail('전설 선택권이 없습니다.')
    const cell = snapToGrid(pos)
    if (!isBuildableCell(cell)) return this.fail('여기에는 지을 수 없습니다.')
    if (this.cellOccupied(cell)) return this.fail('이미 타워가 있는 칸입니다.')
    this.state.legendPicks -= 1
    this.placeTower(bp, cell)
    this.state.message = `[전설] ${bp.name} 확정 건설! (남은 선택권 ${this.state.legendPicks})`
    this.afterChange()
    return true
  }

  private placeTower = (bp: TowerBlueprint, pos: Vec2): Tower => {
    const tower: Tower = { uid: this.nextUid(), blueprint: bp, pos, cooldown: 0, cooldown2: 0, dmgBonusMul: 1, modeTimer: 0, modeType: null, lastTargetUid: -1 }
    this.state.towers.push(tower)
    // 설치·합성 시 자동 선택(정보 표시)하지 않음 — 사용자가 직접 탭해야 정보가 뜬다
    return tower
  }

  mergePartner = (uid: number): Tower | null => {
    const t = this.state.towers.find((x) => x.uid === uid)
    if (!t || t.blueprint.rarity === 'god') return null
    return (
      this.state.towers.find(
        (x) => x.uid !== uid && x.blueprint.id === t.blueprint.id && x.blueprint.rarity === t.blueprint.rarity,
      ) ?? null
    )
  }

  mergeTower = (uid: number): boolean => {
    const a = this.state.towers.find((x) => x.uid === uid)
    if (!a) return false
    const b = this.mergePartner(uid)
    if (!b) {
      this.addEffect(a.pos, 'merge-fail')
      return this.fail('합성할 같은 종류 타워가 없습니다.')
    }
    const up = nextRarity(a.blueprint.rarity)
    if (!up) {
      this.addEffect(a.pos, 'merge-fail')
      return this.fail('신 등급은 더 이상 합성할 수 없습니다.')
    }
    const pos = { ...a.pos }
    this.state.towers = this.state.towers.filter((x) => x.uid !== a.uid && x.uid !== b.uid)
    const bp = randItem(TOWERS_BY_RARITY[up])
    this.placeTower(bp, pos)
    this.addEffect(pos, 'merge-success')
    this.state.message = `합성 성공 → [${RARITY_META[up].label}] ${bp.name}(${RACE_BY_ID[bp.race].short})!`
    this.afterChange()
    return true
  }

  /** 판매 환급 = 등급별 건설 가치의 절반. 합성 누적가(일반100 → 등급마다 ×2: 희귀200·영웅400·전설800·신1600). */
  sellAmount = (rarity: Rarity): number => {
    const rank = RARITY_ORDER.indexOf(rarity)
    const buildValue = BALANCE.towerCost * Math.pow(2, rank)
    return Math.round(buildValue * BALANCE.sellRatio)
  }

  sellTower = (uid: number): void => {
    const t = this.state.towers.find((x) => x.uid === uid)
    if (!t) return
    const refund = this.sellAmount(t.blueprint.rarity)
    this.state.minerals += refund
    this.state.towers = this.state.towers.filter((x) => x.uid !== uid)
    if (this.state.selectedTowerUid === uid) this.state.selectedTowerUid = null
    this.state.message = `타워 판매 (+${refund} 미네랄).`
    this.onChange()
  }

  selectTower = (uid: number | null): void => {
    this.state.selectedTowerUid = uid
    this.onChange()
  }

  // -------------------------------------------------------------------------
  // 가스 도박 / 업그레이드 / 테라진
  // -------------------------------------------------------------------------

  gambleGas = (): boolean => {
    if (this.state.minerals < BALANCE.gasExchangeCost) return this.fail('미네랄이 부족합니다.')
    this.state.minerals -= BALANCE.gasExchangeCost
    const steps = (BALANCE.gasGambleMax - BALANCE.gasGambleMin) / BALANCE.gasGambleStep
    const got = BALANCE.gasGambleMin + Math.floor(Math.random() * (steps + 1)) * BALANCE.gasGambleStep
    this.state.gas += got
    this.state.lastGasGamble = got
    this.state.message = `가스 도박: +${got} 획득!`
    this.onChange()
    return true
  }

  upgradeCost = (race: RaceId): number => BALANCE.upgradeBaseCost + BALANCE.upgradeCostPerLevel * this.state.upgrades[race]

  buyUpgrade = (race: RaceId): void => {
    const level = this.state.upgrades[race]
    if (level >= BALANCE.upgradeMaxLevel) return
    const cost = this.upgradeCost(race)
    if (this.state.gas < cost) return void this.fail('가스가 부족합니다.')
    this.state.gas -= cost
    this.state.upgrades[race] = level + 1
    this.state.message = `${RACE_BY_ID[race].name} 업그레이드 Lv.${level + 1} (공격력 +${+((level + 1) * BALANCE.upgradeBonusPerLevel * 100).toFixed(1)}%)`
    this.onChange()
  }

  terrazineToMinerals = (): void => {
    if (this.state.terrazine < 1) return
    this.state.terrazine -= 1
    this.state.minerals += BALANCE.terrazineToMinerals
    this.state.message = `테라진 → 미네랄 +${BALANCE.terrazineToMinerals}`
    this.onChange()
  }

  terrazineToGas = (): void => {
    if (this.state.terrazine < 1) return
    this.state.terrazine -= 1
    this.state.gas += BALANCE.terrazineToGas
    this.state.message = `테라진 → 가스 +${BALANCE.terrazineToGas}`
    this.onChange()
  }

  // -------------------------------------------------------------------------
  // 실효 스탯 (업그레이드 + 분신 배율)
  // -------------------------------------------------------------------------

  effectiveStats = (bp: TowerBlueprint, dmgBonusMul = 1) => {
    // 혼종 등 다종족은 각 종족 업그레이드를 모두 합산 적용
    const lv = bp.races.reduce((sum, r) => sum + this.state.upgrades[r], 0)
    const dmgMul = 1 + lv * BALANCE.upgradeBonusPerLevel // 단리
    const buff = this.state.allyBuffTimer > 0 ? this.state.allyBuffMul : 1 // 말라쉬 창조의 숨결
    return {
      damage: bp.damage * dmgMul * dmgBonusMul * buff,
      attackSpeed: bp.attackSpeed,
      range: bp.range,
      splashRadius: bp.splashRadius,
      bonusVsBoss: bp.bonusVsBoss,
    }
  }

  // -------------------------------------------------------------------------
  // 퀘스트
  // -------------------------------------------------------------------------

  private checkQuests = (): void => {
    const s = this.state
    const byRarity = (r: string) => s.towers.filter((t) => t.blueprint.rarity === r)
    const award = (id: string, fn: () => void) => {
      if (s.questsDone[id]) return
      s.questsDone[id] = true
      fn()
      const q = QUESTS.find((x) => x.id === id)
      const name = q?.name ?? id
      const reward = q?.reward ?? ''
      s.message = `퀘스트 달성! ${name} → ${reward}`
      this.notify('quest', name, reward)
    }
    const ids = (r: string) => new Set(byRarity(r).map((t) => t.blueprint.id))
    const has = (id: string) => s.towers.some((t) => t.blueprint.id === id)
    // 일반 8종 수집 — 10라운드 이후 달성 시 500, 그 전엔 300
    if (!s.questsDone['collect_common'] && ids('common').size >= 8)
      award('collect_common', () => (s.minerals += s.round > BALANCE.bossEvery ? 500 : 300))
    // 관문 유닛: 희귀 (광전사+용기병) 또는 (바퀴+히드라)
    if (!s.questsDone['gateway'] && ((has('zealot') && has('dragoon')) || (has('roach') && has('hydralisk'))))
      award('gateway', () => (s.minerals += 300))
    // 모든 희귀 8종 수집
    if (!s.questsDone['collect_rare'] && ids('rare').size >= 8) award('collect_rare', () => (s.minerals += 500))
    if (byRarity('hero').length >= 7) award('hero7', () => (s.minerals += 300))
    // 모든 영웅 종류 수집(8종)
    if (!s.questsDone['collect_hero'] && ids('hero').size >= 8) award('collect_hero', () => (s.terrazine += 2))
    // 전설 6개 → 광물 300 + 전설 선택권 1
    if (byRarity('legend').length >= 6) award('legend6', () => ((s.minerals += 300), (s.legendPicks += 1)))
    // 모든 전설 종류 수집(8종) → 전설 선택권 3
    if (!s.questsDone['collect_legend'] && ids('legend').size >= 8) award('collect_legend', () => (s.legendPicks += 3))
    if (byRarity('god').length >= 5) award('god5', () => (s.minerals += 500))
    if (!s.questsDone['tri_god'] && new Set(byRarity('god').map((t) => t.blueprint.race)).size >= 3)
      award('tri_god', () => (s.terrazine += BALANCE.terrazineTriRaceGod))
    // 뫼비우스 혼종 보유
    if (!s.questsDone['mobius'] && has('mobius_hybrid')) award('mobius', () => (s.terrazine += 1))
    // 라이프 5 이하
    if (!s.questsDone['life5'] && s.round >= 1 && s.life <= 5) award('life5', () => ((s.minerals += 200), (s.gas += 100)))
    if (!s.questsDone['kill750'] && s.killCount >= BALANCE.killMilestone)
      award('kill750', () => (s.terrazine += BALANCE.terrazineKillReward))
    if (!s.questsDone['time7'] && s.elapsed >= BALANCE.timeQuest7) award('time7', () => (s.minerals += 200))
    if (!s.questsDone['time12'] && s.elapsed >= BALANCE.timeQuest12) award('time12', () => (s.minerals += 300))
    if (!s.questsDone['time18'] && s.elapsed >= BALANCE.timeQuest18) award('time18', () => (s.terrazine += 2))
  }

  // -------------------------------------------------------------------------
  // 틱 루프
  // -------------------------------------------------------------------------

  tick = (dt: number): void => {
    const s = this.state
    if (s.phase === 'select-difficulty' || s.phase === 'won' || s.phase === 'lost') return

    // 첫 수동 시작 이후부터 시간/카운트다운이 흐른다. (배속이면 dt가 이미 배속 적용됨)
    if (s.autoStarted) {
      s.elapsed += dt
      for (const m of s.missions) if (m.cooldownRemaining > 0) m.cooldownRemaining = Math.max(0, m.cooldownRemaining - dt)
      // 대기 중 자동 시작 카운트다운
      if (s.phase === 'building' && s.nextRoundCountdown > 0) {
        s.nextRoundCountdown = Math.max(0, s.nextRoundCountdown - dt)
        if (s.nextRoundCountdown <= 0) this.startNextRound()
      }
    }

    if (s.phase === 'wave') this.spawnTick(dt)

    // 말라쉬 창조의 숨결 — 아군 버프 지속시간 감소
    if (s.allyBuffTimer > 0) s.allyBuffTimer = Math.max(0, s.allyBuffTimer - dt)

    // 미션 몹은 건설 페이즈에도 맵을 걷는다 → 적이 있으면 전투 시뮬레이션 수행
    if (s.phase === 'wave' || s.enemies.length > 0) {
      this.enemyTick(dt)
      this.towerTick(dt)
      this.minionTick(dt)
      this.projectileTick(dt)
    }
    if (s.phase === 'wave') this.checkRoundEnd()

    this.checkQuests()
    this.onChange()
  }

  private spawnTick = (dt: number): void => {
    if (this.spawnQueue.length === 0) return
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.state.enemies.push(this.spawnQueue.shift()!)
      this.spawnTimer = BALANCE.spawnInterval
    }
  }

  private enemyTick = (dt: number): void => {
    const survivors: Enemy[] = []
    for (const e of this.state.enemies) {
      // 디버프 타이머
      if (e.stunTimer > 0) e.stunTimer = Math.max(0, e.stunTimer - dt)
      if (e.slowTimer > 0) e.slowTimer = Math.max(0, e.slowTimer - dt)
      if (e.ampTimer > 0) e.ampTimer = Math.max(0, e.ampTimer - dt)
      const factor = e.stunTimer > 0 ? 0 : e.slowTimer > 0 ? e.slowFactor : 1
      e.progress += e.speed * factor * dt
      if (e.progress >= PATH_LENGTH) {
        if (e.isBoss && !this.state.endless && this.state.round >= BALANCE.totalRounds) {
          // 최종 50라운드 보스는 막지 못하면 체력과 무관하게 즉시 패배
          this.state.phase = 'lost'
          this.state.message = '최종 보스를 막지 못했습니다… 패배!'
          continue
        }
        if (e.isMission) {
          this.state.life -= BALANCE.lifeLossPerMissionLeak
          this.endMission(e.missionId, false)
        } else {
          this.state.life -= e.isBoss ? BALANCE.lifeLossPerBossLeak : BALANCE.lifeLossPerLeak
        }
        continue
      }
      e.pos = pointAtDistance(e.progress)
      survivors.push(e)
    }
    this.state.enemies = survivors
    if (this.state.phase !== 'lost' && this.state.life <= 0) {
      this.state.life = 0
      this.state.phase = 'lost'
      this.state.message = '패배… 목숨이 모두 소진되었습니다.'
    }
  }

  private towerTick = (dt: number): void => {
    for (const t of this.state.towers) {
      // 보조 무기(골리앗 미사일 등): 본 무기와 독립적으로 발사
      if (t.blueprint.secondary) this.fireSecondary(t, dt)
      // 군단 숙주: 식충 소환(본 무기와 독립 타이머 cooldown2)
      if (t.blueprint.skill === 'summon') this.summonTick(t, dt)
      // 듀크 대체모드 타이머 감소
      if (t.modeTimer > 0) {
        t.modeTimer = Math.max(0, t.modeTimer - dt)
        if (t.modeTimer === 0) t.modeType = null
      }
      t.cooldown -= dt
      if (t.cooldown > 0) continue
      const stats = this.effectiveStats(t.blueprint, t.dmgBonusMul)
      const hits = t.blueprint.hits
      const targets = this.acquireTargets(t.pos, stats.range, hits)
      if (targets.length === 0) {
        // 충전형(모한다르): 사거리에 적이 없으면 충전 초기화
        if (t.blueprint.skill === 'charge') t.dmgBonusMul = 1
        continue
      }
      // 듀크 대체모드: 발동 시 화력/공속/범위 변화
      let dmgMul = 1
      let splashMul = 1
      let cdMul = 1
      if (t.blueprint.skill === 'mode') {
        if (Math.random() < BALANCE.dukeModeChance) {
          t.modeTimer = BALANCE.dukeModeDuration
          t.modeType = randItem<DukeMode>(['fast', 'power', 'aoe'])
        }
        if (t.modeTimer > 0) {
          dmgMul = t.modeType === 'power' ? BALANCE.dukePowerMul : BALANCE.dukeBaseMul
          if (t.modeType === 'fast') cdMul = BALANCE.dukeFastCdMul
          if (t.modeType === 'aoe') splashMul = BALANCE.dukeAoeSplashMul
        }
      }
      t.cooldown = (1 / stats.attackSpeed) * cdMul
      // 사도 분신: 발사 시 확률적으로 공격력 누적 증가
      if (t.blueprint.skill === 'clone' && Math.random() < BALANCE.cloneChance) {
        t.dmgBonusMul = Math.min(t.dmgBonusMul + 1, 1 + BALANCE.cloneMaxStacks)
      }
      // 충전(모한다르 3단 충전): 대상이 바뀌면 초기화(공허 포격기) → 연속 공격마다 증가
      if (t.blueprint.skill === 'charge') {
        if (targets[0].uid !== t.lastTargetUid) t.dmgBonusMul = 1
        t.lastTargetUid = targets[0].uid
        t.dmgBonusMul = Math.min(t.dmgBonusMul + BALANCE.chargeStepMul, BALANCE.chargeMaxMul)
      }
      // 스킬 필드(말라쉬는 발사 시 숨결을 동적으로 결정)
      let projSkill = t.blueprint.skill
      let projSkillChance = t.blueprint.skillChance
      let projSlowFac = t.blueprint.slowFac
      let projAmpFac = t.blueprint.ampFac
      let projSlowDur = t.blueprint.slowDur
      if (t.blueprint.skill === 'malash') {
        projSkill = undefined // 평소엔 광역 평타만
        if (Math.random() < BALANCE.malashChance) {
          if (Math.random() < 0.5) {
            // 창조의 숨결: 아군 공격력 버프
            this.state.allyBuffTimer = BALANCE.allyBuffDuration
            this.state.allyBuffMul = BALANCE.allyBuffMul
          } else {
            // 파괴의 숨결: 범위 감속 + 약화
            projSkill = 'slow'
            projSkillChance = 1
            projSlowFac = BALANCE.malashSlowFac
            projAmpFac = BALANCE.malashAmpFac
            projSlowDur = BALANCE.ampDuration
          }
        }
      }
      // 주기당 hits발 발사 — 대상이 부족하면 앞선 적에게 중복 타격
      const melee = t.blueprint.melee
      const rank = RARITY_ORDER.indexOf(t.blueprint.rarity)
      for (let i = 0; i < hits; i++) {
        const target = targets[i % targets.length]
        this.state.projectiles.push({
          uid: this.nextUid(),
          from: { ...t.pos },
          to: { ...target.pos },
          targetUid: target.uid,
          damage: stats.damage * dmgMul,
          splashRadius: stats.splashRadius * splashMul,
          bonusVsBoss: stats.bonusVsBoss,
          color: t.blueprint.color,
          skill: projSkill,
          skillChance: projSkillChance,
          splashChance: t.blueprint.splashChance,
          slowDur: projSlowDur,
          slowFac: projSlowFac,
          ampFac: projAmpFac,
          multiMul: t.blueprint.multiMul,
          melee,
          rank,
          t: 0,
          speed: melee ? 22 : 6, // 근접은 즉시 명중
        })
      }
      // 사기꾼 샘: 평타당 확률로 폭탄 6발 난사(진행도 상위 적들에게 분산, 단일이면 집중)
      if (t.blueprint.skill === 'bomb' && Math.random() < (t.blueprint.skillChance ?? BALANCE.bombChance)) {
        const bombTargets = this.acquireTargets(t.pos, stats.range, BALANCE.bombCount)
        for (let i = 0; i < BALANCE.bombCount; i++) {
          const target = bombTargets[i % bombTargets.length]
          this.state.projectiles.push({
            uid: this.nextUid(),
            from: { ...t.pos },
            to: { ...target.pos },
            targetUid: target.uid,
            damage: stats.damage * BALANCE.bombDamageMul,
            splashRadius: BALANCE.bombSplash,
            bonusVsBoss: stats.bonusVsBoss,
            color: t.blueprint.color,
            melee: false,
            bomb: true,
            rank,
            t: 0,
            speed: 5,
          })
        }
      }
    }
  }

  /** 군단 숙주 식충 보충(주기마다 부족분 소환) */
  private summonTick = (t: Tower, dt: number): void => {
    t.cooldown2 -= dt
    if (t.cooldown2 > 0) return
    t.cooldown2 = BALANCE.locustInterval
    const alive = this.state.minions.filter((m) => m.ownerUid === t.uid).length
    const stats = this.effectiveStats(t.blueprint, t.dmgBonusMul)
    for (let i = alive; i < BALANCE.locustCount; i++) {
      this.state.minions.push({
        uid: this.nextUid(),
        ownerUid: t.uid,
        pos: { x: t.pos.x + (i - 1.5) * 8, y: t.pos.y },
        damage: stats.damage * BALANCE.locustDamageMul,
        range: BALANCE.locustRange,
        attackSpeed: BALANCE.locustAttackSpeed,
        cooldown: 0,
        speed: BALANCE.locustSpeed,
        life: BALANCE.locustLife,
        color: t.blueprint.color,
        bonusVsBoss: stats.bonusVsBoss,
      })
    }
  }

  /** 식충 등 미니언: 가장 가까운 적으로 이동하며 사거리 내에서 발사체 공격 */
  private minionTick = (dt: number): void => {
    const survivors: Minion[] = []
    for (const m of this.state.minions) {
      m.life -= dt
      // 소환주가 사라졌거나 수명이 끝나면 제거
      if (m.life <= 0 || !this.state.towers.some((t) => t.uid === m.ownerUid)) continue
      // 가장 가까운 적 탐색
      let target: Enemy | null = null
      let best = Infinity
      for (const e of this.state.enemies) {
        const d = Math.hypot(e.pos.x - m.pos.x, e.pos.y - m.pos.y)
        if (d < best) {
          best = d
          target = e
        }
      }
      if (target) {
        if (best > m.range) {
          const dx = target.pos.x - m.pos.x
          const dy = target.pos.y - m.pos.y
          const len = Math.hypot(dx, dy) || 1
          m.pos = { x: m.pos.x + (dx / len) * m.speed * dt, y: m.pos.y + (dy / len) * m.speed * dt }
        }
        m.cooldown -= dt
        if (best <= m.range && m.cooldown <= 0) {
          m.cooldown = 1 / m.attackSpeed
          this.state.projectiles.push({
            uid: this.nextUid(),
            from: { ...m.pos },
            to: { ...target.pos },
            targetUid: target.uid,
            damage: m.damage,
            splashRadius: 0,
            bonusVsBoss: m.bonusVsBoss,
            color: m.color,
            melee: false,
            rank: 1,
            t: 0,
            speed: 10,
          })
        }
      }
      survivors.push(m)
    }
    this.state.minions = survivors
  }

  /** 보조 무기 발사(본 무기와 독립 쿨다운). 골리앗 미사일: 강력·장거리·저속. */
  private fireSecondary = (t: Tower, dt: number): void => {
    const sec = t.blueprint.secondary!
    t.cooldown2 -= dt
    if (t.cooldown2 > 0) return
    const targets = this.acquireTargets(t.pos, sec.range, 1)
    if (targets.length === 0) return
    t.cooldown2 = 1 / sec.attackSpeed
    const lv = t.blueprint.races.reduce((sum, r) => sum + this.state.upgrades[r], 0)
    const damage = sec.damage * (1 + lv * BALANCE.upgradeBonusPerLevel) * t.dmgBonusMul
    const target = targets[0]
    this.state.projectiles.push({
      uid: this.nextUid(),
      from: { ...t.pos },
      to: { ...target.pos },
      targetUid: target.uid,
      damage,
      splashRadius: sec.splashRadius,
      bonusVsBoss: sec.bonusVsBoss,
      color: t.blueprint.color,
      melee: false,
      missile: true,
      rank: RARITY_ORDER.indexOf(t.blueprint.rarity),
      t: 0,
      speed: 4, // 미사일은 다소 느린 투사체
    })
  }

  /** 사거리 내 진행도 높은 순으로 최대 n마리 */
  private acquireTargets = (pos: Vec2, range: number, n: number): Enemy[] =>
    this.state.enemies
      .filter((e) => Math.hypot(e.pos.x - pos.x, e.pos.y - pos.y) <= range)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, n)

  private projectileTick = (dt: number): void => {
    const alive: Projectile[] = []
    for (const p of this.state.projectiles) {
      p.t += p.speed * dt
      if (p.t < 1) {
        const tgt = this.state.enemies.find((e) => e.uid === p.targetUid)
        if (tgt) p.to = { ...tgt.pos }
        alive.push(p)
        continue
      }
      this.resolveHit(p)
    }
    this.state.projectiles = alive
  }

  private resolveHit = (p: Projectile): void => {
    const primary = this.state.enemies.find((e) => e.uid === p.targetUid)
    const impact = primary ? primary.pos : p.to
    this.addImpact(p, impact.x, impact.y)
    // 스킬 발동 판정(확률형). 발동 시에만 다중타격/감속/기절 적용
    const proc = p.skill ? Math.random() < (p.skillChance ?? 1) : false
    // 피해 대상 집합 결정
    let targets: Enemy[]
    if (p.splashRadius > 0) {
      // 평타 광역. splashChance가 있으면 확률 발동(미발동 시 단일)
      const doSplash = p.splashChance === undefined || Math.random() < p.splashChance
      targets = doSplash
        ? this.state.enemies.filter((e) => Math.hypot(e.pos.x - impact.x, e.pos.y - impact.y) <= p.splashRadius)
        : primary
          ? [primary]
          : []
    } else if (p.skill === 'multi3' && proc) {
      // 확률 다중타격: 주변 진행도 상위 적들 동시 타격
      targets = [...this.state.enemies]
        .filter((e) => Math.hypot(e.pos.x - impact.x, e.pos.y - impact.y) <= BALANCE.multiRadius)
        .sort((a, b) => b.progress - a.progress)
        .slice(0, BALANCE.multiTargets)
    } else {
      targets = primary ? [primary] : []
    }
    for (const e of targets) {
      let dmg = e.isBoss ? p.damage * p.bonusVsBoss : p.damage
      // 다중타격 2차 대상(쿠쿨자 쿠션 등)은 감쇠
      if (p.multiMul !== undefined && e.uid !== p.targetUid) dmg *= p.multiMul
      // 받는 피해 증폭(약화) 적용
      if (e.ampTimer > 0) dmg *= e.ampFactor
      e.hp -= dmg
      if (proc) {
        if (p.skill === 'slow') {
          e.slowTimer = p.slowDur ?? BALANCE.slowDuration
          e.slowFactor = p.slowFac ?? BALANCE.slowFactor
        } else if (p.skill === 'stun' && !e.isBoss) {
          e.stunTimer = BALANCE.stunDuration
        }
        if (p.ampFac !== undefined) {
          e.ampTimer = BALANCE.ampDuration
          e.ampFactor = p.ampFac
        }
      }
    }
    // 사망 처리
    const survivors: Enemy[] = []
    for (const e of this.state.enemies) {
      if (e.hp <= 0) {
        this.state.minerals += e.bounty
        this.state.killCount++
        if (e.isMission) {
          this.endMission(e.missionId, true)
          this.state.message = `개인 미션 클리어! +${e.bounty} 미네랄`
          this.notify('mission', '개인 미션 클리어', `+${e.bounty} 미네랄`)
        }
      } else survivors.push(e)
    }
    this.state.enemies = survivors
    this.checkQuests()
  }

  private checkRoundEnd = (): void => {
    if (this.state.phase !== 'wave') return
    // 라운드 종료는 "해당 라운드 소속(roundBound) 적이 모두 죽었을 때". 대기 중 소환된 미션몹은 무시.
    if (this.spawnQueue.length > 0 || this.state.enemies.some((e) => e.roundBound)) return

    this.state.minerals += BALANCE.rewardPerRound
    if (this.isBossRound(this.state.round)) {
      this.state.terrazine += BALANCE.terrazinePerBoss
      this.state.message = `보스 처치! 테라진 +${BALANCE.terrazinePerBoss} (+${BALANCE.rewardPerRound} 미네랄)`
      this.notify('boss', `라운드 ${this.state.round} 보스 처치`, `테라진 +${BALANCE.terrazinePerBoss} · 미네랄 +${BALANCE.rewardPerRound}`)
    } else {
      this.state.message = `라운드 ${this.state.round} 클리어! (+${BALANCE.rewardPerRound} 미네랄)`
    }

    if (!this.state.endless && this.state.round >= BALANCE.totalRounds) {
      this.state.phase = 'won'
      this.state.message = '🎉 50라운드 클리어! 무한모드로 계속하거나 종료하세요.'
    } else {
      this.state.phase = 'building'
      this.state.nextRoundCountdown = BALANCE.roundInterval // 자동 시작 카운트다운
      // 다음이 최종 보스면 미리 경고
      if (!this.state.endless && this.state.round + 1 === BALANCE.totalRounds) {
        this.notify('boss', '⚠️ 다음이 최종 보스', '막지 못하면 체력과 무관하게 즉시 패배!')
      }
    }
    this.state.projectiles = []
    this.checkQuests()
  }

  /** 50R 클리어 후 무한모드 진입 */
  continueEndless = (): void => {
    if (this.state.phase !== 'won') return
    this.state.endless = true
    this.state.terrazine += BALANCE.endlessTerrazineGrant
    this.state.phase = 'building'
    this.state.nextRoundCountdown = BALANCE.roundInterval
    this.state.message = `무한모드 시작! 테라진 +${BALANCE.endlessTerrazineGrant}. 51라운드부터 계속됩니다.`
    this.onChange()
  }

  // -------------------------------------------------------------------------
  // 보조 / 조회
  // -------------------------------------------------------------------------

  private fail = (msg: string): boolean => {
    this.state.message = msg
    this.onChange()
    return false
  }

  private afterChange = (): void => {
    this.checkQuests()
    this.onChange()
  }

  get selectedTower(): Tower | null {
    return this.state.towers.find((t) => t.uid === this.state.selectedTowerUid) ?? null
  }

  questProgress = (id: string): string => {
    const s = this.state
    const c = (r: string) => s.towers.filter((t) => t.blueprint.rarity === r).length
    const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
    const uniq = (r: string) => new Set(s.towers.filter((t) => t.blueprint.rarity === r).map((t) => t.blueprint.id)).size
    const has = (i: string) => s.towers.some((t) => t.blueprint.id === i)
    switch (id) {
      case 'collect_common':
        return `${uniq('common')}/8`
      case 'gateway':
        return (has('zealot') && has('dragoon')) || (has('roach') && has('hydralisk')) ? '달성' : '광전사+용기병 / 바퀴+히드라'
      case 'collect_rare':
        return `${uniq('rare')}/8`
      case 'hero7':
        return `${c('hero')}/7`
      case 'collect_hero':
        return `${uniq('hero')}/8`
      case 'legend6':
        return `${c('legend')}/6`
      case 'collect_legend':
        return `${uniq('legend')}/8`
      case 'mobius':
        return has('mobius_hybrid') ? '달성' : '뫼비우스 혼종 필요'
      case 'life5':
        return `목숨 ${s.life}${s.life <= 5 ? ' ✔' : ' (≤5)'}`
      case 'god5':
        return `${c('god')}/5`
      case 'tri_god':
        return `${new Set(s.towers.filter((t) => t.blueprint.rarity === 'god').map((t) => t.blueprint.race)).size}/3`
      case 'kill750':
        return `${Math.min(s.killCount, BALANCE.killMilestone)}/${BALANCE.killMilestone}`
      case 'time7':
      case 'time12':
      case 'time18': {
        const q = QUESTS.find((x) => x.id === id)
        return q?.timeThreshold ? `${mmss(Math.min(s.elapsed, q.timeThreshold))}/${mmss(q.timeThreshold)}` : ''
      }
      default:
        return ''
    }
  }

  reset = (): void => {
    Object.assign(this.state, this.freshState())
    this.spawnQueue = []
    this.onChange()
  }
}

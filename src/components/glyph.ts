// 절차적 캐릭터 글리프 — 캔버스로 직접 그려 이모지 오버플로 방지(GameField·인스펙터 공용).
// 타워 id마다 고유한 실루엣을 그려 실제 SC2 유닛 특징을 살리고, 어떤 두 캐릭터도 겹치지 않게 한다.
// 모든 좌표는 중심(0,0) 기준 ±10 범위(타워 본체 ±16 박스 안).

export const raceColor = (r: string): string => (r === 'terran' ? '#3b82f6' : r === 'protoss' ? '#facc15' : '#ec4899')

export const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

type Pt = [number, number]

// id별 글리프 그리기 함수. ctx는 이미 중심으로 translate된 상태.
export const drawGlyph = (ctx: CanvasRenderingContext2D, id: string, cx: number, cy: number): void => {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.lineJoin = ctx.lineCap = 'round'
  ctx.strokeStyle = '#f1f5f9'
  ctx.fillStyle = '#e2e8f0'
  ctx.lineWidth = 1.6

  // --- 그리기 헬퍼 ---
  const L = (...p: Pt[]) => { ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke() }
  const PG = (p: Pt[], fill = false) => { ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); fill ? ctx.fill() : ctx.stroke() }
  const D = (x: number, y: number, r: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill() }
  const O = (x: number, y: number, r: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke() }
  const ARC = (x: number, y: number, r: number, a0: number, a1: number) => { ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke() }
  const ELL = (x: number, y: number, rx: number, ry: number) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke() }
  const lw = (w: number) => (ctx.lineWidth = w)
  // 두 다리(서 있는 인간형)
  const legs = (y = 4, w = 3, h = 8) => { L([-w, h], [0, y], [w, h]) }

  switch (id) {
    // ===== 일반 =====
    case 'scv': // SCV 일꾼: 작업복 몸체 + 용접 집게팔 + 불꽃
      ctx.strokeRect(-4, -3, 8, 7); ARC(0, -3, 3, Math.PI, 0)
      L([4, 0], [8, -1]); L([8, -1], [9.5, -2.5]); L([8, -1], [9.5, 0.5])
      D(9.5, -1, 0.9); L([-4, 4], [-5, 7]); L([4, 4], [5, 7]); break
    case 'trooper': // 해병: 큰 어깨 견장 + 가우스 라이플
      D(0, -6, 2.2); lw(2.6); L([-5, -3], [5, -3]); lw(1.6)
      L([0, -3], [0, 4]); legs(); lw(2); L([1, -1], [8, -1]); break
    case 'reaper': // 사신: 제트팩 화염 + 쌍권총
      D(0, -6, 2.1); L([0, -4], [0, 3]); legs(3)
      L([-1, -2], [-6, -3]); L([1, -2], [6, -3])
      PG([[-3, 3], [-5, 8], [-1, 5]]); PG([[3, 3], [5, 8], [1, 5]]); break
    case 'fanatic': // 추종자: 두건 + 머리 위 교차 블레이드
      PG([[0, -8], [3, -4], [-3, -4]]); D(0, -4, 1.5); L([0, -2], [0, 5]); legs(5)
      lw(2); L([-3, 2], [4, -7]); L([3, 2], [-4, -7]); break
    case 'stalker': // 추적자: 중앙 안광 + 사방으로 뻗은 4다리
      O(0, -1, 3.2); D(0, -1, 1)
      L([-2, 0], [-7, -4]); L([-2, 1], [-7, 6]); L([2, 0], [7, -4]); L([2, 1], [7, 6]); break
    case 'gargoyle': // 가고일: 기계 박쥐 날개 + 콕핏 + 꼬리
      PG([[0, -2], [-9, -5], [-4, 2]]); PG([[0, -2], [9, -5], [4, 2]]); D(0, 0, 2); L([0, 2], [0, 6]); break
    case 'overlord': // 대군주: 떠다니는 기낭 + 촉수 + 머리혹
      ELL(0, -2, 6, 5); L([-3, 3], [-4, 8]); L([0, 3], [0, 8]); L([3, 3], [4, 8]); D(0, -7, 1.3); break
    case 'zergling': // 저글링: 낮은 몸 + 앞으로 뻗은 큰 발톱 + 등가시
      ELL(-1, 2, 4, 3); L([3, 1], [9, -2]); L([3, 3], [9, 2]); L([-3, 0], [-6, -4]); L([-1, -1], [-3, -5]); break

    // ===== 희귀 =====
    case 'marauder_corps': // 불곰: 육중한 장갑 몸체 + 유탄발사기
      roundRect(ctx, -5, -3, 10, 9, 3); ctx.stroke(); D(0, -6, 2)
      lw(2.4); L([3, -1], [9, -2]); lw(1.6); L([-3, 6], [-4, 9]); L([3, 6], [4, 9]); break
    case 'cyclone': // 사이클론: 바퀴 차체 + 미사일 포드
      O(0, 2, 4); ctx.strokeRect(-4, -5, 8, 5); lw(2); L([2, -5], [8, -6]); L([2, -3], [8, -3]); break
    case 'ghost': // 유령: 슬림 + 바이저 + 긴 저격총
      D(0, -6, 1.9); L([-2.5, -6], [2.5, -6]); L([0, -4], [0, 4]); legs()
      lw(2); L([-2, -1], [10, -3]); break
    case 'zealot': // 광전사: 앞으로 나란한 두 사이오닉 칼날 + 치마형 다리
      D(0, -6, 2); L([0, -4], [0, 3]); PG([[-3, 3], [3, 3], [2, 8], [-2, 8]])
      lw(2); L([1, -2], [9, -3]); L([1, 0], [9, -1]); break
    case 'dragoon': // 용기병: 큰 구체 몸통 + 아래로 뻗은 4개 기계다리
      O(0, -3, 4); D(0, -3, 1)
      L([-3, 0], [-5, 8]); L([-1, 1], [-2, 8]); L([3, 0], [5, 8]); L([1, 1], [2, 8]); break
    case 'warp_prism': // 차원분광기: 크리스탈 다이아 + 양옆 패널
      PG([[0, -6], [5, 0], [0, 6], [-5, 0]]); L([-5, 0], [-9, 0]); L([5, 0], [9, 0]); break
    case 'roach': // 바퀴: 장갑 등딱지 + 짧은 다리 + 산성침
      ARC(0, 1, 5, Math.PI, 0); L([-5, 1], [5, 1])
      L([-3, 1], [-5, 5]); L([-1, 1], [-2, 5]); L([3, 1], [5, 5]); L([1, 1], [2, 5]); D(0, 4.5, 0.9); break
    case 'hydralisk': // 히드라리스크: 곧추선 몸 + 두건머리 + 등가시
      L([0, 8], [0, -2]); PG([[0, -2], [3, -6], [0, -8], [-3, -6]])
      L([-1, 4], [-5, 2]); L([-1, 1], [-5, -1]); L([1, 3], [5, 5]); break

    // ===== 영웅 =====
    case 'goliath': // 골리앗: 이족 보행 + 어깨 쌍포
      ctx.strokeRect(-4, -3, 8, 6); D(0, -5, 1.6)
      L([-4, -3], [-6, -9]); L([4, -3], [6, -9]); L([-3, 3], [-4, 9]); L([3, 3], [4, 9]); break
    case 'thor': // 토르: 거대 각진 기체 + 양팔 대포 + 안테나
      ctx.strokeRect(-6, -4, 12, 8); L([0, -4], [0, -8])
      lw(2); L([-6, -1], [-10, -2]); L([6, -1], [10, -2]); lw(1.6); L([-4, 4], [-5, 9]); L([4, 4], [5, 9]); break
    case 'ascendant': // 승천자: 로브 + 머리 위 사이오닉 구체
      PG([[0, -3], [4, 8], [-4, 8]]); D(0, -5, 1.8); O(0, -9, 1.7); break
    case 'executor': // 집행관: 왕관형 머리 + 옆에 든 지팡이
      PG([[0, -4], [4, 8], [-4, 8]]); D(0, -6, 1.7)
      PG([[-3, -7], [-1.5, -10], [0, -7], [1.5, -10], [3, -7]]); lw(2); L([5, -8], [5, 8]); lw(1.6); D(5, -8, 1.2); break
    case 'reaver': // 리버: 굼벵이형 로봇 몸 + 등 분절 + 스캐럽
      ARC(0, 2, 6, Math.PI, 0); L([-6, 2], [6, 2])
      L([-3, -1], [-3, 2]); L([0, -2], [0, 2]); L([3, -1], [3, 2]); D(7.5, 2, 1); break
    case 'swarm_host': // 무리군주: 잠복 둔덕 + 가시 + 식충 알
      ARC(0, 4, 6, Math.PI, 0); L([-6, 4], [6, 4])
      L([-2, 0], [-3, -4]); L([0, -1], [0, -5]); L([2, 0], [3, -4]); D(-7.5, 2, 0.9); D(7.5, 2, 0.9); break
    case 'queen': // 여왕: 곧추선 몸 + 양옆 날개막 + 머리
      L([0, 8], [0, -3]); PG([[0, -3], [2, -7], [0, -9], [-2, -7]])
      PG([[-2, -3], [-8, 0], [-3, 3]]); PG([[2, -3], [8, 0], [3, 3]]); L([-3, 8], [3, 8]); break
    case 'primal_igniter': // 정수 점화체: 네발 야수 + 불꽃 갈기
      ELL(0, 2, 5, 3); PG([[-4, 0], [-5, -5], [-2, -1]]); PG([[-1, -1], [0, -6], [2, -1]]); PG([[3, 0], [5, -5], [2, -1]])
      L([-4, 4], [-5, 8]); L([4, 4], [5, 8]); D(6, 2.5, 1.2); break

    // ===== 전설 =====
    case 'valerius': // 발레리우스: 망토 두른 영웅 병사 + 라이플
      D(0, -6, 2); L([0, -4], [0, 4]); legs(); PG([[-1, -3], [-6, 2], [-1, 6]]); lw(2); L([1, -1], [8, -2]); break
    case 'warfield': // 워필드 장군: 장갑 상체 + 어깨 포 + 가슴 별
      roundRect(ctx, -4, -3, 8, 8, 2); ctx.stroke(); D(0, -6, 2)
      L([4, -3], [9, -5]); L([-3, 5], [-4, 9]); L([3, 5], [4, 9]); D(0, 0, 0.7); break
    case 'mojo': // 모조(정찰기 에이스): 앞으로 젖혀진 날개 + 추진기
      PG([[0, -7], [3, 4], [-3, 4]]); L([-3, 0], [-8, 4]); L([3, 0], [8, 4]); L([0, 4], [0, 8]); D(0, 8, 1); break
    case 'mohandar': // 모한다르(암흑 장로): 두건 + 만곡 워프 블레이드
      PG([[0, -8], [3, -3], [-3, -3]]); D(0, -4, 1.4); L([0, -3], [0, 4]); PG([[-2, 4], [2, 4], [1, 8], [-1, 8]])
      lw(2.2); ARC(3, -2, 6, 2.3, 3.7); break
    case 'urun': // 우룬(불사조 함대): 위로 치켜든 양 날개 + 상단 구체
      D(0, -3, 2); PG([[-2, -2], [-9, -6], [-3, 2]]); PG([[2, -2], [9, -6], [3, 2]]); L([0, 2], [0, 8]); D(0, -8, 1.4); break
    case 'zagara': // 자가라(번식 군주): S자 몸체 + 부화 알 + 작은 날개
      ctx.beginPath(); ctx.moveTo(-7, 7); ctx.quadraticCurveTo(6, 4, -2, -1); ctx.quadraticCurveTo(-8, -5, 5, -7); ctx.stroke()
      D(5, -7, 1.4); D(-5, 5, 0.8); D(1, 1, 0.8); PG([[-2, 0], [-7, -2], [-3, 3]]); break
    case 'torrasque': // 토라스크: 거대 몸체 + 앞으로 뻗은 큰 엄니 + 네발
      ELL(-1, 0, 5, 4); lw(2.2); L([4, -1], [10, -4]); L([4, 1.5], [10, -0.5])
      lw(1.6); L([-4, 3], [-5, 8]); L([-1, 4], [-1, 8]); L([2, 4], [3, 8]); break
    case 'mecha_ravager': // 메카 궤멸충: 기계 몸 + 곤충 다리 + 부식 포
      ctx.strokeRect(-4, -3, 8, 6); L([-4, 3], [-8, 7]); L([-4, 1], [-8, 2]); L([4, 3], [8, 7]); L([4, 1], [8, 2])
      lw(2); L([0, -3], [3, -8]); lw(1.6); D(3, -8, 1); break

    // ===== 신 =====
    case 'sam': // 폭파병: 손에 든 둥근 폭탄 + 도화선
      D(0, -6, 2); L([0, -4], [0, 4]); legs(); L([1, 0], [3.5, 0]); O(6.5, 0, 3); L([6.5, -3], [7.5, -5]); break
    case 'tauren_marine': // 타우렌 해병: 뿔 달린 큰 머리 + 우람한 몸 + 라이플
      D(0, -5, 2.4); L([-2, -6], [-5, -9]); L([2, -6], [5, -9])
      roundRect(ctx, -4, -3, 8, 7, 2); ctx.stroke(); L([-3, 4], [-4, 9]); L([3, 4], [4, 9]); lw(2); L([3, 0], [9, -1]); break
    case 'duke': // 듀크(공성전차): 차체 + 긴 포신 + 안테나
      roundRect(ctx, -7, 1, 14, 5, 2); ctx.stroke(); ARC(0, 1, 3, Math.PI, 0)
      lw(2); L([0, -1], [10, -3]); lw(1.6); L([0, -1], [0, -5]); D(0, -5, 0.8); break
    case 'rasagal': // 라사라(대모): 높은 왕관 두건 + 넓은 로브 + 지팡이
      PG([[0, -10], [3, -3], [-3, -3]]); D(0, -5, 1.4); PG([[-3, 4], [3, 4], [5, 9], [-5, 9]]); L([0, -3], [0, 4])
      lw(2); L([5.5, -7], [5.5, 7]); lw(1.6); D(5.5, -7, 1.1); break
    case 'malash': // 말라쉬(혼종 술사): 비대칭 — 기계팔 + 유기 발톱 + 핵
      D(0, -5, 2); L([0, -3], [0, 4]); legs()
      ctx.strokeRect(-9, -2, 4, 3); L([-5, -0.5], [-1, -1])
      L([1, -1], [6, -3]); L([6, -3], [8, -5]); L([6, -3], [8, -1]); D(0, 0.5, 1); break
    case 'vorazun': // 보라준(대모 전사): 망토 + 머리 위 교차 암흑 블레이드
      PG([[0, -8], [2, -4], [-2, -4]]); D(0, -4, 1.3); L([0, -3], [0, 4]); PG([[-2, 4], [2, 4], [4, 9], [-4, 9]])
      lw(2); L([-4, -2], [4, -7]); L([4, -2], [-4, -7]); break
    case 'impaler': // 가시지옥: 잠복 둔덕 + 솟구친 긴 가시 + 미늘
      ARC(0, 6, 5, Math.PI, 0); L([-5, 6], [5, 6]); L([0, 6], [0, -8])
      L([0, -2], [-4, -5]); L([0, 0], [-4, -2]); L([0, -2], [4, -5]); L([0, 0], [4, -2]); break
    case 'sliven': // 슬리븐: 똬리 튼 몸 + 등가시 + 머리
      ARC(0, 1, 5, 0.3, Math.PI * 2 - 0.3); D(5, 4, 1.3); D(5, 3, 0.4)
      L([-3, -3], [-5, -7]); L([0, -4], [0, -8]); L([3, -3], [5, -7]); break
    case 'mobius_hybrid': // 뫼비우스 혼종: 큰 다이아 + 중앙 안광 + 한쪽 칼날 한쪽 발톱
      PG([[0, -9], [5, 0], [0, 9], [-5, 0]]); D(0, 0, 1.6)
      lw(2); L([-2, -2], [-7, -6]); lw(1.6); L([2, 2], [7, 6]); L([7, 6], [9.5, 4]); L([7, 6], [9.5, 8]); break
    case 'raynor': // 레이너: 바이저 + 비대칭 어깨 패드 + 라이플
      D(0, -6, 2.2); L([-2, -7], [2, -7]); L([-5, -3], [2, -3]); L([0, -3], [0, 4]); legs(); lw(2); L([1, -1], [9, -2]); break
    case 'zeratul': // 제라툴: 두건 + 머리 위로 휘둘러진 큰 워프 낫
      PG([[0, -8], [3, -3], [-3, -3]]); D(0, -4, 1.4); L([0, -3], [0, 4]); PG([[-2, 4], [2, 4], [1, 8], [-1, 8]])
      lw(2.4); ARC(-2, -2, 9, -0.5, 0.85); break
    case 'kukulza': // 쿠쿨자(비행 에이스): 유기 곡선 날개 + 머리 + 갈래 꼬리
      PG([[0, -1], [-10, -4], [-3, 3]]); PG([[0, -1], [10, -4], [3, 3]]); D(0, -1, 2); D(0, -5, 1.2)
      L([0, 1], [0, 7]); L([0, 7], [-2, 9]); L([0, 7], [2, 9]); break

    default: // 안전 폴백
      O(0, 0, 4)
  }
  ctx.restore()
}

/** 인스펙터 등에서 쓰는 타워 엠블럼(종족 본체 + 등급 테두리 + 글리프) */
export const drawEmblem = (
  ctx: CanvasRenderingContext2D,
  bp: { id: string; race: string; races: string[]; color: string },
  cx: number,
  cy: number,
  r: number,
): void => {
  ctx.globalAlpha = 0.4
  if (bp.races.length > 1) {
    ctx.save()
    roundRect(ctx, cx - r, cy - r, r * 2, r * 2, 5)
    ctx.clip()
    const sw = (r * 2) / bp.races.length
    bp.races.forEach((rc, i) => {
      ctx.fillStyle = raceColor(rc)
      ctx.fillRect(cx - r + i * sw, cy - r, sw + 0.5, r * 2)
    })
    ctx.restore()
  } else {
    ctx.fillStyle = raceColor(bp.race)
    roundRect(ctx, cx - r, cy - r, r * 2, r * 2, 5)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.strokeStyle = bp.color
  ctx.lineWidth = 2.5
  roundRect(ctx, cx - r, cy - r, r * 2, r * 2, 5)
  ctx.stroke()
  drawGlyph(ctx, bp.id, cx, cy)
}

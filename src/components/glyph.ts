// 절차적 캐릭터 글리프 — 캔버스로 직접 그려 이모지 오버플로 방지(GameField·인스펙터 공용)

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

export const ARCHETYPE: Record<string, string> = {
  scv: 'mech', trooper: 'soldier', reaper: 'soldier', fanatic: 'warrior', stalker: 'strider', gargoyle: 'flyer', overlord: 'flyer', zergling: 'bug',
  marauder_corps: 'soldier', cyclone: 'mech', ghost: 'sniper', zealot: 'warrior', dragoon: 'strider', warp_prism: 'ship', roach: 'bug', hydralisk: 'serpent',
  goliath: 'mech', thor: 'mech', ascendant: 'caster', executor: 'caster', reaver: 'mech', swarm_host: 'bug', queen: 'serpent', primal_igniter: 'beast',
  valerius: 'soldier', warfield: 'soldier', mojo: 'ship', mohandar: 'caster', urun: 'caster', zagara: 'serpent', torrasque: 'beast', mecha_ravager: 'bug',
  sam: 'soldier', tauren_marine: 'soldier', duke: 'tank', rasagal: 'ship', malash: 'caster', vorazun: 'warrior', impaler: 'serpent', sliven: 'beast',
  mobius_hybrid: 'hybrid', raynor: 'soldier', zeratul: 'warrior', kukulza: 'flyer',
}

export const drawGlyph = (ctx: CanvasRenderingContext2D, art: string, cx: number, cy: number): void => {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.lineJoin = ctx.lineCap = 'round'
  ctx.strokeStyle = '#f1f5f9'
  ctx.fillStyle = '#e2e8f0'
  ctx.lineWidth = 1.6
  const P = (fn: () => void) => {
    ctx.beginPath()
    fn()
  }
  switch (art) {
    case 'soldier':
      P(() => ctx.arc(0, -6, 2.6, 0, Math.PI * 2)); ctx.fill()
      P(() => { ctx.moveTo(0, -3); ctx.lineTo(0, 5) }); ctx.stroke()
      P(() => { ctx.moveTo(-4, 7); ctx.lineTo(0, 5); ctx.lineTo(4, 7) }); ctx.stroke()
      P(() => { ctx.moveTo(-1, 0); ctx.lineTo(7, -2) }); ctx.stroke()
      break
    case 'sniper':
      P(() => ctx.arc(0, -6, 2.4, 0, Math.PI * 2)); ctx.fill()
      P(() => { ctx.moveTo(0, -3); ctx.lineTo(0, 5) }); ctx.stroke()
      P(() => { ctx.moveTo(-4, 7); ctx.lineTo(0, 5); ctx.lineTo(4, 7) }); ctx.stroke()
      ctx.lineWidth = 2; P(() => { ctx.moveTo(-2, -1); ctx.lineTo(9, -3) }); ctx.stroke()
      break
    case 'warrior':
      P(() => ctx.arc(0, -5, 2.4, 0, Math.PI * 2)); ctx.fill()
      P(() => { ctx.moveTo(0, -2); ctx.lineTo(0, 6) }); ctx.stroke()
      P(() => { ctx.moveTo(-2, 0); ctx.lineTo(-8, 6); ctx.moveTo(2, 0); ctx.lineTo(8, 6) }); ctx.stroke()
      break
    case 'mech':
      ctx.strokeRect(-5, -5, 10, 8)
      P(() => { ctx.moveTo(-5, 3); ctx.lineTo(-7, 8); ctx.moveTo(5, 3); ctx.lineTo(7, 8) }); ctx.stroke()
      P(() => { ctx.moveTo(0, -5); ctx.lineTo(0, -9) }); ctx.stroke()
      break
    case 'tank':
      ctx.strokeRect(-7, 0, 14, 6)
      P(() => ctx.arc(0, 0, 3, Math.PI, 0)); ctx.stroke()
      ctx.lineWidth = 2; P(() => { ctx.moveTo(0, -1); ctx.lineTo(9, -4) }); ctx.stroke()
      break
    case 'strider':
      P(() => ctx.arc(0, -2, 3, 0, Math.PI * 2)); ctx.fill()
      P(() => { ctx.moveTo(-2, 0); ctx.lineTo(-7, 8); ctx.moveTo(-1, 0); ctx.lineTo(-3, 9); ctx.moveTo(2, 0); ctx.lineTo(7, 8); ctx.moveTo(1, 0); ctx.lineTo(3, 9) }); ctx.stroke()
      break
    case 'flyer':
      P(() => { ctx.moveTo(0, -6); ctx.lineTo(8, 5); ctx.lineTo(0, 2); ctx.lineTo(-8, 5); ctx.closePath() }); ctx.stroke()
      break
    case 'ship':
      P(() => ctx.ellipse(0, 0, 8, 3.4, 0, 0, Math.PI * 2)); ctx.stroke()
      P(() => { ctx.moveTo(-8, 0); ctx.lineTo(-11, 0) }); ctx.stroke()
      break
    case 'bug':
      P(() => ctx.ellipse(0, 0, 4, 5.5, 0, 0, Math.PI * 2)); ctx.stroke()
      P(() => { ctx.moveTo(-4, -2); ctx.lineTo(-8, -5); ctx.moveTo(4, -2); ctx.lineTo(8, -5) }); ctx.stroke()
      P(() => { ctx.moveTo(-4, 2); ctx.lineTo(-8, 5); ctx.moveTo(4, 2); ctx.lineTo(8, 5) }); ctx.stroke()
      break
    case 'serpent':
      P(() => { ctx.moveTo(-6, 6); ctx.quadraticCurveTo(7, 3, -2, -2); ctx.quadraticCurveTo(-9, -6, 5, -7) }); ctx.stroke()
      break
    case 'beast':
      P(() => ctx.ellipse(0, 1, 6, 5, 0, 0, Math.PI * 2)); ctx.stroke()
      P(() => { ctx.moveTo(-5, -3); ctx.lineTo(-8, -8); ctx.moveTo(5, -3); ctx.lineTo(8, -8) }); ctx.stroke()
      break
    case 'caster':
      P(() => ctx.arc(0, 0, 3, 0, Math.PI * 2)); ctx.fill()
      P(() => ctx.arc(0, 0, 7, 0, Math.PI * 2)); ctx.stroke()
      break
    case 'hybrid':
      P(() => { ctx.moveTo(0, -8); ctx.lineTo(4, 0); ctx.lineTo(0, 8); ctx.lineTo(-4, 0); ctx.closePath() }); ctx.stroke()
      P(() => ctx.arc(0, 0, 2, 0, Math.PI * 2)); ctx.fill()
      break
    default:
      P(() => ctx.arc(0, 0, 4, 0, Math.PI * 2)); ctx.stroke()
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
  drawGlyph(ctx, ARCHETYPE[bp.id] ?? 'soldier', cx, cy)
}

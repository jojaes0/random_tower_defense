// 맵 — 사용자 스프레드시트 구조(12×12). 방(#=설치)들을 복도(.)가 격자로 가른다.
// 시작(S)=좌상단, 도착(E)=상단 중앙. 적은 복도를 따라 S→E로 이동한다.

import type { Vec2 } from './types'

export const CELL = 48
export const COLS = 12
export const ROWS = 12

/** 타일 맵: S=시작 E=도착 #=설치(건설칸) .=복도(이동로) */
export const MAP: string[] = [
  'S###E##.....',
  '.###.##.###.',
  '.###.##.###.',
  '.###.##.###.',
  '............',
  '####.##.####',
  '####.##.####',
  '............',
  '.###.##.###.',
  '.###.##.###.',
  '.###.##.###.',
  '.....##.....',
]

export const FIELD = {
  width: COLS * CELL,
  height: ROWS * CELL,
  pathClearance: 0, // 맵 기반이라 미사용
}

const center = (col: number, row: number): Vec2 => ({ x: (col + 0.5) * CELL, y: (row + 0.5) * CELL })

/** 적 이동 경로 — 벽(설치블록/가장자리)에 막힐 때만 꺾는다. 교차점은 직진.
 *  [col,row], -1은 화면 밖(스폰/퇴장)용. */
const ROUTE: [number, number][] = [
  [0, -1], // 화면 밖 진입
  [0, 0], //  시작 — 오른쪽이 벽(#) → 아래로
  [0, 4], //  아래로 직진, row5가 벽 → 오른쪽으로
  [11, 4], // 오른쪽 끝(가장자리) → 위로
  [11, 0], // 위 끝 → 왼쪽으로
  [7, 0], //  col6이 벽 → 아래로
  [7, 11], // 아래 끝 → 오른쪽으로
  [11, 11], // 오른쪽 끝 → 위로
  [11, 7], // row6가 벽 → 왼쪽으로
  [0, 7], //  왼쪽 끝 → 아래로
  [0, 11], // 아래 끝 → 오른쪽으로
  [4, 11], // col5가 벽 → 위로
  [4, 0], //  도착(E)
  [4, -1], // 화면 밖 퇴장
]

export const WAYPOINTS: Vec2[] = ROUTE.map(([c, r]) => center(c, r))

export const PATH_START: Vec2 = center(0, 0)
export const PATH_END: Vec2 = center(4, 0)

/** 그리드(맵 타일과 동일) */
export const GRID = { size: CELL, cols: COLS, rows: ROWS }

export const snapToGrid = (p: Vec2): Vec2 => ({
  x: (Math.floor(p.x / CELL) + 0.5) * CELL,
  y: (Math.floor(p.y / CELL) + 0.5) * CELL,
})

const tileAt = (p: Vec2): string => {
  const col = Math.floor(p.x / CELL)
  const row = Math.floor(p.y / CELL)
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return ' '
  return MAP[row][col] ?? ' '
}

/** 셀 중심이 건설 가능한 칸(#)인지 */
export const isBuildableCell = (centerPos: Vec2): boolean => tileAt(centerPos) === '#'

/** 건설 가능한 모든 칸 중심 */
export const buildableCells: Vec2[] = (() => {
  const cells: Vec2[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (MAP[r][c] === '#') cells.push(center(c, r))
    }
  }
  return cells
})()

// 세그먼트/누적 길이
const segLengths: number[] = []
const cumLengths: number[] = [0]
for (let i = 0; i < WAYPOINTS.length - 1; i++) {
  const a = WAYPOINTS[i]
  const b = WAYPOINTS[i + 1]
  segLengths.push(Math.hypot(b.x - a.x, b.y - a.y))
  cumLengths.push(cumLengths[i] + segLengths[i])
}

export const PATH_LENGTH = cumLengths[cumLengths.length - 1]

export const pointAtDistance = (dist: number): Vec2 => {
  if (dist <= 0) return { ...WAYPOINTS[0] }
  if (dist >= PATH_LENGTH) return { ...WAYPOINTS[WAYPOINTS.length - 1] }
  let seg = 0
  while (seg < segLengths.length - 1 && cumLengths[seg + 1] <= dist) seg++
  const a = WAYPOINTS[seg]
  const b = WAYPOINTS[seg + 1]
  const tt = (dist - cumLengths[seg]) / segLengths[seg]
  return { x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt }
}

/** 점에서 경로까지 최단 거리(렌더/판정 보조) */
export const distanceToPath = (p: Vec2): number => {
  let min = Infinity
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const a = WAYPOINTS[i]
    const b = WAYPOINTS[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lenSq = dx * dx + dy * dy || 1
    let tt = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
    tt = Math.max(0, Math.min(1, tt))
    const d = Math.hypot(p.x - (a.x + dx * tt), p.y - (a.y + dy * tt))
    if (d < min) min = d
  }
  return min
}

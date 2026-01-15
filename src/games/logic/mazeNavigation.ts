/**
 * 迷宮導航遊戲邏輯模組
 * 訓練：空間導航、規劃能力、問題解決
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export type CellType = 'path' | 'wall' | 'start' | 'end'

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface MazeConfig {
  /** 迷宮大小 */
  size: number
  /** 複雜度 */
  complexity: number
}

export interface Position {
  row: number
  col: number
}

export interface MazeState {
  /** 迷宮格子 */
  cells: CellType[]
  /** 玩家位置（索引） */
  playerPosition: number
  /** 起點位置（索引） */
  startPosition: number
  /** 終點位置（索引） */
  endPosition: number
  /** 迷宮大小 */
  size: number
}

export interface MazeResult {
  /** 最終分數 (0-100) */
  score: number
  /** 步數 */
  moves: number
  /** 最佳步數估算 */
  optimalMoves: number
  /** 效率 */
  efficiency: number
  /** 完成時間（秒） */
  timeSpent: number
  /** 平均每步時間（毫秒） */
  avgMoveTime: number
}

// ==================== 難度配置 ====================

export const DIFFICULTY_CONFIGS: Record<Difficulty, MazeConfig> = {
  easy: {
    size: 9,
    complexity: 0.35,
  },
  medium: {
    size: 11,
    complexity: 0.5,
  },
  hard: {
    size: 13,
    complexity: 0.7,
  },
}

// ==================== 迷宮生成 ====================

/**
 * 計算索引轉位置
 */
export function indexToPosition(index: number, size: number): Position {
  return {
    row: Math.floor(index / size),
    col: index % size,
  }
}

/**
 * 計算位置轉索引
 */
export function positionToIndex(row: number, col: number, size: number): number {
  return row * size + col
}

/**
 * 取得未訪問的鄰居（步長為 2，用於迷宮生成）
 */
function getUnvisitedNeighbors(
  index: number,
  visited: Set<number>,
  size: number
): number[] {
  const { row, col } = indexToPosition(index, size)
  const neighbors: number[] = []
  const directions = [
    { dr: -2, dc: 0 },
    { dr: 2, dc: 0 },
    { dr: 0, dc: -2 },
    { dr: 0, dc: 2 },
  ]

  for (const { dr, dc } of directions) {
    const newRow = row + dr
    const newCol = col + dc
    const newIndex = positionToIndex(newRow, newCol, size)

    if (
      newRow > 0 && newRow < size - 1 &&
      newCol > 0 && newCol < size - 1 &&
      !visited.has(newIndex)
    ) {
      neighbors.push(newIndex)
    }
  }

  return neighbors
}

/**
 * 取得兩個格子之間的牆
 */
function getWallBetween(a: number, b: number, size: number): number {
  const posA = indexToPosition(a, size)
  const posB = indexToPosition(b, size)
  return positionToIndex(
    (posA.row + posB.row) / 2,
    (posA.col + posB.col) / 2,
    size
  )
}

/**
 * 計算最短路徑距離（BFS）
 */
export function getShortestPathLength(
  cells: CellType[],
  size: number,
  startIndex: number,
  endIndex: number
): number {
  const queue: number[] = [startIndex]
  const distances = new Array<number>(cells.length).fill(-1)
  distances[startIndex] = 0

  while (queue.length > 0) {
    const current = queue.shift()
    if (typeof current !== 'number') continue
    if (current === endIndex) return distances[current] ?? 0

    const { row, col } = indexToPosition(current, size)
    const neighbors = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ]

    for (const n of neighbors) {
      if (n.row < 0 || n.row >= size || n.col < 0 || n.col >= size) continue
      const idx = positionToIndex(n.row, n.col, size)
      if (cells[idx] === 'wall' || distances[idx] !== -1) continue
      const currentDistance = distances[current] ?? 0
      distances[idx] = currentDistance + 1
      queue.push(idx)
    }
  }

  return Math.max(0, distances[endIndex] ?? 0)
}

function getDistancesFromStart(
  cells: CellType[],
  size: number,
  startIndex: number
): number[] {
  const queue: number[] = [startIndex]
  const distances = new Array<number>(cells.length).fill(-1)
  distances[startIndex] = 0

  while (queue.length > 0) {
    const current = queue.shift()
    if (typeof current !== 'number') continue
    const { row, col } = indexToPosition(current, size)
    const neighbors = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ]

    for (const n of neighbors) {
      if (n.row < 0 || n.row >= size || n.col < 0 || n.col >= size) continue
      const idx = positionToIndex(n.row, n.col, size)
      if (cells[idx] === 'wall' || distances[idx] !== -1) continue
      const currentDistance = distances[current] ?? 0
      distances[idx] = currentDistance + 1
      queue.push(idx)
    }
  }

  return distances
}

function selectEndByComplexity(
  distances: number[],
  complexity: number
): number {
  const indexed = distances
    .map((dist, index) => ({ dist, index }))
    .filter(item => item.dist >= 0)
    .sort((a, b) => b.dist - a.dist)

  if (indexed.length === 0) return 0

  const bias = Math.max(0, Math.min(1, 1 - complexity))
  const pickIndex = Math.min(
    indexed.length - 1,
    Math.floor(bias * bias * (indexed.length - 1))
  )

  return indexed[pickIndex]?.index ?? indexed[0]!.index
}

/**
 * 使用遞歸回溯法生成迷宮
 */
export function generateMaze(config: MazeConfig): MazeState {
  const { size } = config
  const cells: CellType[] = new Array(size * size).fill('wall')

  const visited = new Set<number>()
  const stack: number[] = []

  // 起點（左上角內部）
  const startIndex = positionToIndex(1, 1, size)
  cells[startIndex] = 'path'
  visited.add(startIndex)
  stack.push(startIndex)

  // 使用遞歸回溯法生成迷宮
  while (stack.length > 0) {
    const current = stack[stack.length - 1]!
    const neighbors = getUnvisitedNeighbors(current, visited, size)

    if (neighbors.length > 0) {
      const nextIdx = Math.floor(Math.random() * neighbors.length)
      const next = neighbors[nextIdx]!

      // 打通牆壁
      const wallIndex = getWallBetween(current, next, size)
      cells[wallIndex] = 'path'
      cells[next] = 'path'

      visited.add(wallIndex)
      visited.add(next)
      stack.push(next)
    } else {
      stack.pop()
    }
  }

  // 選擇距離最遠的終點（依複雜度調整）
  const distances = getDistancesFromStart(cells, size, startIndex)
  const endIndex = selectEndByComplexity(distances, config.complexity)

  cells[startIndex] = 'start'
  cells[endIndex] = 'end'

  return {
    cells,
    playerPosition: startIndex,
    startPosition: startIndex,
    endPosition: endIndex,
    size,
  }
}

// ==================== 移動邏輯 ====================

/**
 * 計算方向移動後的目標位置
 */
export function getTargetPosition(
  currentIndex: number,
  direction: Direction,
  size: number
): number | null {
  const { row, col } = indexToPosition(currentIndex, size)

  let targetRow = row
  let targetCol = col

  switch (direction) {
    case 'up':
      targetRow = row - 1
      break
    case 'down':
      targetRow = row + 1
      break
    case 'left':
      targetCol = col - 1
      break
    case 'right':
      targetCol = col + 1
      break
  }

  // 檢查邊界
  if (
    targetRow < 0 || targetRow >= size ||
    targetCol < 0 || targetCol >= size
  ) {
    return null
  }

  return positionToIndex(targetRow, targetCol, size)
}

/**
 * 檢查是否可以移動到指定方向
 */
export function canMove(
  maze: MazeState,
  direction: Direction
): boolean {
  const targetIndex = getTargetPosition(maze.playerPosition, direction, maze.size)
  
  if (targetIndex === null) return false
  
  const targetCell = maze.cells[targetIndex]
  return targetCell !== 'wall'
}

/**
 * 執行移動
 */
export function move(
  maze: MazeState,
  direction: Direction
): MazeState | null {
  if (!canMove(maze, direction)) return null

  const targetIndex = getTargetPosition(maze.playerPosition, direction, maze.size)
  if (targetIndex === null) return null

  return {
    ...maze,
    playerPosition: targetIndex,
  }
}

/**
 * 檢查是否到達終點
 */
export function hasReachedEnd(maze: MazeState): boolean {
  return maze.playerPosition === maze.endPosition
}

/**
 * 取得格子類型
 */
export function getCellType(maze: MazeState, index: number): CellType {
  return maze.cells[index] ?? 'wall'
}

// ==================== 評分函數 ====================

/**
 * 估算最佳步數（曼哈頓距離的近似）
 */
export function estimateOptimalMoves(size: number): number {
  return (size - 2) * 2
}

/**
 * 計算效率
 */
export function calculateEfficiency(moves: number, optimalMoves: number): number {
  if (optimalMoves <= 0) return 0
  if (moves <= optimalMoves) return 1
  return Math.max(0, 1 - (moves - optimalMoves) / (optimalMoves * 2))
}

/**
 * 計算最終分數 (0-100)
 */
export function calculateScore(
  moves: number,
  timeSpent: number,
  optimalMoves: number
): number {
  // 效率分數 60%
  const efficiency = calculateEfficiency(moves, optimalMoves)
  const efficiencyScore = efficiency * 60

  // 時間分數 40%
  const maxTime = Math.max(15, Math.round(optimalMoves * 3))
  const timeScore = Math.max(0, (1 - timeSpent / maxTime) * 40)

  return Math.round(Math.min(100, Math.max(0, efficiencyScore + timeScore)))
}

/**
 * 計算等級
 */
export function calculateGrade(score: number): string {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}

/**
 * 彙整遊戲結果
 */
export function summarizeResult(
  moves: number,
  timeSpent: number,
  size: number,
  optimalMovesOverride?: number
): MazeResult {
  const optimalMoves = optimalMovesOverride ?? estimateOptimalMoves(size)
  const efficiency = calculateEfficiency(moves, optimalMoves)
  const score = calculateScore(moves, timeSpent, optimalMoves)
  const avgMoveTime = moves > 0 ? Math.round((timeSpent * 1000) / moves) : 0

  return {
    score,
    moves,
    optimalMoves,
    efficiency,
    timeSpent,
    avgMoveTime,
  }
}

/**
 * 格式化時間顯示
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

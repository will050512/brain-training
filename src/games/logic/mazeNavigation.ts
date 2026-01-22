/**
 * 迷宮導航 (皇家花園版) 遊戲邏輯模組
 * * 修正版：
 * 1. 配合新遊戲註冊表調整難度參數 (Size: 7/9/11)。
 * 2. 保持足跡 (visited) 功能。
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export type CellType = 'path' | 'wall' | 'start' | 'end' | 'decoration'

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface MazeConfig {
  /** 地圖大小 */
  size: number
  /** 複雜度 */
  complexity: number
  /** 生成模式 */
  mode: 'scatter' | 'shapes' | 'maze'
}

export interface MazeState {
  cells: CellType[]
  playerPosition: number
  startPosition: number
  endPosition: number
  size: number
  // 記錄走過的路徑索引，用於顯示足跡
  visitedPath: number[] 
}

export interface MazeResult {
  score: number
  moves: number
  optimalMoves: number
  efficiency: number
  timeSpent: number
  avgMoveTime: number
}

// ==================== 難度配置 (更新) ====================

export const DIFFICULTY_CONFIGS: Record<Difficulty, MazeConfig> = {
  easy: {
    size: 7,
    complexity: 0.3,
    mode: 'scatter' // 簡單散點
  },
  medium: {
    size: 9,
    complexity: 0.4,
    mode: 'shapes'  // 幾何障礙
  },
  hard: {
    size: 11,
    complexity: 0.5,
    mode: 'maze'    // 完整迷宮
  },
}

// ==================== 核心邏輯 ====================

export function indexToPosition(index: number, size: number) {
  return { row: Math.floor(index / size), col: index % size }
}

export function positionToIndex(row: number, col: number, size: number): number {
  return row * size + col
}

/**
 * 計算最短路徑距離 (BFS)
 */
export function getShortestPathLength(
  cells: CellType[],
  size: number,
  startIndex: number,
  endIndex: number
): number {
  const queue: { index: number; dist: number }[] = [{ index: startIndex, dist: 0 }]
  const visited = new Set<number>([startIndex])
  
  let head = 0
  while (head < queue.length) {
    const current = queue[head++]!
    if (current.index === endIndex) return current.dist

    const { row, col } = indexToPosition(current.index, size)
    const dirs = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }]

    for (const d of dirs) {
      const nr = row + d.r
      const nc = col + d.c
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        const nextIdx = positionToIndex(nr, nc, size)
        if (!visited.has(nextIdx) && cells[nextIdx] !== 'wall') {
          visited.add(nextIdx)
          queue.push({ index: nextIdx, dist: current.dist + 1 })
        }
      }
    }
  }
  return -1
}

// ========== 生成演算法：簡單 (散點) ==========
function generateScatterMap(size: number, density: number): CellType[] {
  const cells: CellType[] = new Array(size * size).fill('path')
  const count = Math.floor(size * size * density)
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * cells.length)
    cells[idx] = 'wall'
  }
  return cells
}

// ========== 生成演算法：中等 (幾何花圃) ==========
function generateShapesMap(size: number, complexity: number): CellType[] {
  const cells: CellType[] = new Array(size * size).fill('path')
  const numShapes = Math.floor(size / 2)
  
  for (let i = 0; i < numShapes; i++) {
    const type = Math.random() > 0.5 ? 'line' : 'rect'
    const startRow = Math.floor(Math.random() * (size - 2)) + 1
    const startCol = Math.floor(Math.random() * (size - 2)) + 1
    
    if (type === 'line') {
      const isHorizontal = Math.random() > 0.5
      const length = Math.floor(Math.random() * 2) + 2
      for (let k = 0; k < length; k++) {
        const r = isHorizontal ? startRow : startRow + k
        const c = isHorizontal ? startCol + k : startCol
        if (r < size - 1 && c < size - 1) cells[positionToIndex(r, c, size)] = 'wall'
      }
    } else {
      // 2x2 花圃
      for (let r = startRow; r < startRow + 2 && r < size - 1; r++) {
        for (let c = startCol; c < startCol + 2 && c < size - 1; c++) {
          cells[positionToIndex(r, c, size)] = 'wall'
        }
      }
    }
  }
  return cells
}

// ========== 生成演算法：困難 (有機迷宮) ==========
function generateMazeMap(size: number): CellType[] {
  const cells: CellType[] = new Array(size * size).fill('wall')
  const miners = [{ index: positionToIndex(1, 1, size), life: size * 3 }]
  cells[miners[0].index] = 'path'
  
  let loopCount = 0
  const maxLoops = size * size * 5
  
  let carvedCount = 1
  const targetCarved = Math.floor(size * size * 0.55)

  while (carvedCount < targetCarved && loopCount < maxLoops) {
    loopCount++
    if (miners.length === 0) break
    const minerIdx = Math.floor(Math.random() * miners.length)
    const miner = miners[minerIdx]
    
    const { row, col } = indexToPosition(miner.index, size)
    const dirs = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }]
    dirs.sort(() => Math.random() - 0.5)
    
    let moved = false
    for (const d of dirs) {
      const nr = row + d.r
      const nc = col + d.c
      if (nr > 0 && nr < size - 1 && nc > 0 && nc < size - 1) {
        const nextIdx = positionToIndex(nr, nc, size)
        
        let adjacentWalls = 0
        const neighbors = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }]
        for (const n of neighbors) {
          const nIdx = positionToIndex(nr + n.r, nc + n.c, size)
          if (cells[nIdx] === 'wall') adjacentWalls++
        }

        if (cells[nextIdx] === 'wall' && adjacentWalls >= 2) {
          cells[nextIdx] = 'path'
          miners.push({ index: nextIdx, life: size })
          carvedCount++
          moved = true
          break
        }
      }
    }
    
    if (!moved) {
      miner.life--
      if (miner.life <= 0) miners.splice(minerIdx, 1)
    }
  }

  cells[positionToIndex(1, 1, size)] = 'path'
  cells[positionToIndex(size - 2, size - 2, size)] = 'path'
  
  return cells
}

// ========== 主生成函數 ==========

export function generateMaze(config: MazeConfig): MazeState {
  const { size, complexity, mode } = config
  let cells: CellType[] = []
  let startIndex = 0
  let endIndex = 0
  let isValid = false
  let attempts = 0

  while (!isValid && attempts < 50) {
    attempts++
    
    if (mode === 'maze') {
      cells = generateMazeMap(size)
    } else if (mode === 'shapes') {
      cells = generateShapesMap(size, complexity)
    } else {
      cells = generateScatterMap(size, complexity)
    }

    startIndex = positionToIndex(1, 1, size)
    endIndex = positionToIndex(size - 2, size - 2, size)
    
    cells[startIndex] = 'path'
    cells[endIndex] = 'path'
    
    // 保護起終點周圍
    const protectedIndices = [
      startIndex, startIndex + 1, startIndex + size, 
      endIndex, endIndex - 1, endIndex - size
    ]
    protectedIndices.forEach(idx => {
      if (idx >= 0 && idx < cells.length) cells[idx] = 'path'
    })

    const pathLen = getShortestPathLength(cells, size, startIndex, endIndex)
    
    if (pathLen > 0) {
      // 確保路徑不會太短
      if (mode === 'maze' && pathLen < size * 1.5) {
        isValid = false
      } else {
        isValid = true
      }
    }
  }

  // Fallback
  if (!isValid) {
    cells = new Array(size * size).fill('path')
    startIndex = 0
    endIndex = size * size - 1
  }

  cells[startIndex] = 'start'
  cells[endIndex] = 'end'

  return {
    cells,
    playerPosition: startIndex,
    startPosition: startIndex,
    endPosition: endIndex,
    size,
    visitedPath: [startIndex]
  }
}

// ==================== 移動邏輯 ====================

export function getTargetPosition(
  currentIndex: number,
  direction: Direction,
  size: number
): number | null {
  const { row, col } = indexToPosition(currentIndex, size)
  let targetRow = row
  let targetCol = col

  switch (direction) {
    case 'up': targetRow--; break
    case 'down': targetRow++; break
    case 'left': targetCol--; break
    case 'right': targetCol++; break
  }

  if (targetRow < 0 || targetRow >= size || targetCol < 0 || targetCol >= size) {
    return null
  }
  return positionToIndex(targetRow, targetCol, size)
}

export function canMove(maze: MazeState, direction: Direction): boolean {
  const targetIndex = getTargetPosition(maze.playerPosition, direction, maze.size)
  if (targetIndex === null) return false
  return maze.cells[targetIndex] !== 'wall'
}

export function move(maze: MazeState, direction: Direction): MazeState | null {
  if (!canMove(maze, direction)) return null
  const targetIndex = getTargetPosition(maze.playerPosition, direction, maze.size)!
  
  const newVisited = [...maze.visitedPath]
  if (!newVisited.includes(targetIndex)) {
    newVisited.push(targetIndex)
  }

  return { 
    ...maze, 
    playerPosition: targetIndex,
    visitedPath: newVisited
  }
}

export function hasReachedEnd(maze: MazeState): boolean {
  return maze.playerPosition === maze.endPosition
}

export function getCellType(maze: MazeState, index: number): CellType {
  return maze.cells[index]
}

// ==================== 評分與統計 ====================

export function summarizeResult(
  moves: number,
  timeSpent: number,
  size: number,
  optimalMovesOverride?: number
): MazeResult {
  const optimalMoves = optimalMovesOverride ?? (size * 1.5)
  
  // 寬容度
  const tolerance = 1.3
  const efficiency = Math.max(0, 1 - Math.max(0, moves - optimalMoves * tolerance) / (optimalMoves * 2))

  const efficiencyScore = efficiency * 70
  
  const standardTime = Math.max(20, optimalMoves * 2) 
  const timeScore = Math.max(0, Math.min(30, (standardTime / Math.max(1, timeSpent)) * 30))

  const totalScore = Math.round(efficiencyScore + timeScore)
  const avgMoveTime = moves > 0 ? Math.round((timeSpent * 1000) / moves) : 0

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    moves,
    optimalMoves: Math.round(optimalMoves),
    efficiency,
    timeSpent,
    avgMoveTime,
  }
}
/**
 * 卡片配對遊戲邏輯
 * 包含卡片生成、配對檢查、分數計算
 */

export interface Card {
  id: number
  emoji: string
  pairId: number
  isFlipped: boolean
  isMatched: boolean
}

export interface CardMatchConfig {
  /** 配對數量 */
  pairs: number
  /** 預覽時間（毫秒） */
  previewTime: number
  /** 格線列數 */
  gridCols: number
  /** 時間限制（秒），0 為無限制 */
  timeLimit: number
}

// 難度配置
export const CARD_MATCH_CONFIGS: Record<'easy' | 'medium' | 'hard', CardMatchConfig> = {
  easy: {
    pairs: 4,
    previewTime: 3500,
    gridCols: 4,
    timeLimit: 0, // 無時間限制
  },
  medium: {
    pairs: 8,
    previewTime: 2500,
    gridCols: 4,
    timeLimit: 150,
  },
  hard: {
    pairs: 12,
    previewTime: 2000,
    gridCols: 4,
    timeLimit: 120,
  },
}

// 可用的圖案池
export const EMOJI_POOL = [
  // 水果
  '🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🥝', '🍒',
  // 花草
  '🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🍀', '🌵',
  // 動物
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  // 天氣
  '⭐', '🌙', '☀️', '⚡', '🔥', '💧', '❄️', '🌈',
  // 物品
  '🎈', '🎁', '🎀', '🎄', '🎃', '🎪', '🎨', '🎭',
]

/**
 * 隨機打亂陣列
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

/**
 * 生成卡片
 */
export function generateCards(config: CardMatchConfig): Card[] {
  // 隨機選擇圖案
  const shuffledEmojis = shuffle(EMOJI_POOL)
  const selectedEmojis = shuffledEmojis.slice(0, config.pairs)

  // 創建配對卡片
  const cards: Card[] = []
  let cardId = 0
  
  selectedEmojis.forEach((emoji, pairId) => {
    // 每個圖案創建兩張卡片
    cards.push({
      id: cardId++,
      emoji,
      pairId,
      isFlipped: false,
      isMatched: false,
    })
    cards.push({
      id: cardId++,
      emoji,
      pairId,
      isFlipped: false,
      isMatched: false,
    })
  })

  // 洗牌
  return shuffle(cards)
}

/**
 * 檢查兩張卡片是否配對
 */
export function checkMatch(card1: Card, card2: Card): boolean {
  return card1.pairId === card2.pairId && card1.id !== card2.id
}

/**
 * 翻開卡片
 */
export function flipCard(cards: Card[], index: number): Card[] {
  return cards.map((card, i) => 
    i === index ? { ...card, isFlipped: true } : card
  )
}

/**
 * 翻回卡片
 */
export function unflipCards(cards: Card[], indices: number[]): Card[] {
  return cards.map((card, i) => 
    indices.includes(i) ? { ...card, isFlipped: false } : card
  )
}

/**
 * 標記配對成功
 */
export function markMatched(cards: Card[], indices: number[]): Card[] {
  return cards.map((card, i) => 
    indices.includes(i) ? { ...card, isMatched: true } : card
  )
}

/**
 * 顯示所有卡片（預覽）
 */
export function showAllCards(cards: Card[]): Card[] {
  return cards.map(card => ({ ...card, isFlipped: true }))
}

/**
 * 隱藏所有未配對的卡片
 */
export function hideUnmatchedCards(cards: Card[]): Card[] {
  return cards.map(card => 
    card.isMatched ? card : { ...card, isFlipped: false }
  )
}

/**
 * 計算分數
 * @param matchedPairs 已配對數
 * @param totalPairs 總配對數
 * @param moves 翻牌次數
 * @param elapsedTime 經過時間（秒）
 */
export function calculateScore(
  matchedPairs: number,
  totalPairs: number,
  moves: number,
  elapsedTime: number
): number {
  // 完成度基礎分
  const completionScore = (matchedPairs / totalPairs) * 50
  
  // 效率分（理想步數 = 配對數 * 2）
  const idealMoves = totalPairs * 2
  const efficiency = Math.max(0, 1 - (moves - idealMoves) / (totalPairs * 4))
  const efficiencyScore = efficiency * 30
  
  // 時間獎勵
  const expectedTime = totalPairs * 12 // 預期每對 12 秒（較友善）
  const timeBonus = Math.max(0, 1 - elapsedTime / expectedTime)
  const timeScore = timeBonus * 20
  
  return Math.round(completionScore + efficiencyScore + timeScore)
}

/**
 * 計算評價等級
 */
export function calculateGrade(
  score: number,
  moves: number,
  totalPairs: number
): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const idealMoves = totalPairs * 2
  const moveRatio = idealMoves / moves
  
  // 綜合評估
  const composite = (score / 100) * 0.6 + moveRatio * 0.4
  
  if (composite >= 0.95) return 'S'
  if (composite >= 0.85) return 'A'
  if (composite >= 0.70) return 'B'
  if (composite >= 0.55) return 'C'
  if (composite >= 0.40) return 'D'
  return 'F'
}

/**
 * 遊戲結果類型
 */
export interface CardMatchResult {
  score: number
  matchedPairs: number
  totalPairs: number
  moves: number
  duration: number
  avgMoveTime: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  isComplete: boolean
}

/**
 * 彙總遊戲結果
 */
export function summarizeResult(
  matchedPairs: number,
  totalPairs: number,
  moves: number,
  duration: number
): CardMatchResult {
  const score = calculateScore(matchedPairs, totalPairs, moves, duration)
  const grade = calculateGrade(score, moves, totalPairs)
  const avgMoveTime = moves > 0 ? Math.round((duration * 1000) / moves) : 0
  
  return {
    score,
    matchedPairs,
    totalPairs,
    moves,
    duration,
    avgMoveTime,
    grade,
    isComplete: matchedPairs === totalPairs,
  }
}

/**
 * 取得網格 CSS class
 */
export function getGridClass(cols: number): string {
  return `grid-cols-${cols}`
}

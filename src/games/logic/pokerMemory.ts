/**
 * 撲克記憶遊戲邏輯模組
 * 訓練：短期記憶、視覺空間記憶、注意力
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export interface PokerCard {
  id: number
  suit: string
  rank: string
  isFlipped: boolean
  isMatched: boolean
}

export interface PokerMemoryConfig {
  /** 配對數量 */
  pairs: number
  /** 網格列數 */
  gridCols: number
  /** 時間限制（秒） */
  timeLimit: number
  /** 偷看時間（毫秒） */
  peekTime: number
  /** 每對基礎分數 */
  points: number
}

export interface PokerMemoryResult {
  /** 最終分數 */
  score: number
  /** 滿分 */
  maxScore: number
  /** 準確率 */
  accuracy: number
  /** 遊戲時長（秒） */
  timeSpent: number
  /** 配對成功數 */
  matchedPairs: number
  /** 總配對數 */
  totalPairs: number
  /** 翻牌次數 */
  moves: number
  /** 是否完成 */
  completed: boolean
  /** 剩餘時間（秒） */
  timeLeft: number
}

// ==================== 常數配置 ====================

export const SUITS = ['♠', '♥', '♦', '♣'] as const
export type Suit = (typeof SUITS)[number]

export const SUIT_COLORS: Record<Suit, string> = {
  '♠': '#1a1a1a',
  '♥': '#ef4444',
  '♦': '#ef4444',
  '♣': '#1a1a1a',
}

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const

export const DIFFICULTY_CONFIGS: Record<Difficulty, PokerMemoryConfig> = {
  easy: {
    pairs: 6,
    gridCols: 4,
    timeLimit: 120,
    peekTime: 3000,
    points: 20,
  },
  medium: {
    pairs: 8,
    gridCols: 4,
    timeLimit: 120,
    peekTime: 2000,
    points: 25,
  },
  hard: {
    pairs: 12,
    gridCols: 6,
    timeLimit: 120,
    peekTime: 1500,
    points: 30,
  },
}

// ==================== 工具函數 ====================

/**
 * Fisher-Yates 洗牌算法
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]!
    result[i] = result[j]!
    result[j] = temp
  }
  return result
}

/**
 * 產生撲克牌組
 */
export function generateCards(config: PokerMemoryConfig): PokerCard[] {
  const usedCombos = new Set<string>()
  const cardPairs: { suit: string; rank: string }[] = []

  // 隨機選擇花色和數字組合
  while (cardPairs.length < config.pairs) {
    const suitIndex = Math.floor(Math.random() * SUITS.length)
    const rankIndex = Math.floor(Math.random() * RANKS.length)
    const suit = SUITS[suitIndex]!
    const rank = RANKS[rankIndex]!
    const combo = `${suit}${rank}`

    if (!usedCombos.has(combo)) {
      usedCombos.add(combo)
      cardPairs.push({ suit, rank })
    }
  }

  // 建立成對卡片
  const cards: PokerCard[] = []
  cardPairs.forEach((card, index) => {
    cards.push({
      id: index * 2,
      suit: card.suit,
      rank: card.rank,
      isFlipped: false,
      isMatched: false,
    })
    cards.push({
      id: index * 2 + 1,
      suit: card.suit,
      rank: card.rank,
      isFlipped: false,
      isMatched: false,
    })
  })

  // 洗牌
  return shuffle(cards)
}

/**
 * 翻開所有卡片（偷看階段）
 */
export function flipAllCards(cards: PokerCard[]): PokerCard[] {
  return cards.map(card => ({ ...card, isFlipped: true }))
}

/**
 * 蓋上所有未配對的卡片
 */
export function coverAllCards(cards: PokerCard[]): PokerCard[] {
  return cards.map(card => ({
    ...card,
    isFlipped: card.isMatched,
  }))
}

/**
 * 翻開指定卡片
 */
export function flipCard(cards: PokerCard[], cardId: number): PokerCard[] {
  return cards.map(card =>
    card.id === cardId ? { ...card, isFlipped: true } : card
  )
}

/**
 * 蓋上指定的卡片
 */
export function coverCards(cards: PokerCard[], cardIds: number[]): PokerCard[] {
  return cards.map(card =>
    cardIds.includes(card.id) ? { ...card, isFlipped: false } : card
  )
}

/**
 * 檢查兩張卡片是否配對
 */
export function checkMatch(card1: PokerCard, card2: PokerCard): boolean {
  return card1.suit === card2.suit && card1.rank === card2.rank
}

/**
 * 標記卡片為已配對
 */
export function markAsMatched(cards: PokerCard[], cardIds: number[]): PokerCard[] {
  return cards.map(card =>
    cardIds.includes(card.id) ? { ...card, isMatched: true } : card
  )
}

/**
 * 取得翻開但未配對的卡片
 */
export function getFlippedCards(cards: PokerCard[]): PokerCard[] {
  return cards.filter(card => card.isFlipped && !card.isMatched)
}

/**
 * 檢查遊戲是否完成
 */
export function isGameComplete(cards: PokerCard[]): boolean {
  return cards.every(card => card.isMatched)
}

/**
 * 計算配對成功的數量
 */
export function getMatchedCount(cards: PokerCard[]): number {
  return cards.filter(card => card.isMatched).length / 2
}

// ==================== 評分函數 ====================

/**
 * 計算配對得分
 */
export function calculatePairScore(
  config: PokerMemoryConfig,
  timeLeft: number,
  moves: number
): number {
  const timeBonus = Math.floor(timeLeft / 10)
  const moveBonus = Math.max(0, 10 - Math.floor(moves / config.pairs))
  return config.points + timeBonus + moveBonus
}

/**
 * 計算完成獎勵
 */
export function calculateCompletionBonus(timeLeft: number): number {
  return Math.floor(timeLeft * 2)
}

/**
 * 計算最大可能分數
 */
export function calculateMaxScore(config: PokerMemoryConfig): number {
  return config.pairs * (config.points + 20)
}

/**
 * 計算等級
 */
export function calculateGrade(score: number, maxScore: number): string {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
  if (percentage >= 90) return 'S'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  return 'D'
}

/**
 * 彙整遊戲結果
 */
export function summarizeResult(
  score: number,
  matchedPairs: number,
  moves: number,
  timeLeft: number,
  config: PokerMemoryConfig
): PokerMemoryResult {
  const timeSpent = config.timeLimit - timeLeft
  const completed = matchedPairs === config.pairs
  const accuracy = moves > 0 ? matchedPairs / moves : 0
  const maxScore = calculateMaxScore(config)

  return {
    score,
    maxScore,
    accuracy,
    timeSpent,
    matchedPairs,
    totalPairs: config.pairs,
    moves,
    completed,
    timeLeft,
  }
}

/**
 * 格式化時間顯示
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

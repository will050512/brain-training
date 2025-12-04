/**
 * 卡片配對遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  generateCards,
  checkMatch,
  flipCard,
  unflipCards,
  markMatched,
  showAllCards,
  hideUnmatchedCards,
  calculateScore,
  calculateGrade,
  summarizeResult,
  getGridClass,
  CARD_MATCH_CONFIGS,
  EMOJI_POOL,
  type Card,
  type CardMatchConfig
} from '../cardMatch'

describe('CardMatch Logic', () => {
  describe('generateCards', () => {
    it('should generate correct number of cards', () => {
      const config = CARD_MATCH_CONFIGS.easy
      const cards = generateCards(config)
      
      expect(cards).toHaveLength(config.pairs * 2)
    })

    it('should generate pairs of matching cards', () => {
      const config = CARD_MATCH_CONFIGS.easy
      const cards = generateCards(config)
      
      // 每個 pairId 應該剛好出現兩次
      const pairCounts = new Map<number, number>()
      cards.forEach(card => {
        pairCounts.set(card.pairId, (pairCounts.get(card.pairId) || 0) + 1)
      })
      
      pairCounts.forEach((count) => {
        expect(count).toBe(2)
      })
    })

    it('should initialize cards with correct default state', () => {
      const config = CARD_MATCH_CONFIGS.easy
      const cards = generateCards(config)
      
      cards.forEach(card => {
        expect(card.isFlipped).toBe(false)
        expect(card.isMatched).toBe(false)
        expect(card.emoji).toBeTruthy()
        expect(EMOJI_POOL).toContain(card.emoji)
      })
    })

    it('should assign unique IDs to each card', () => {
      const config = CARD_MATCH_CONFIGS.hard
      const cards = generateCards(config)
      
      const ids = cards.map(c => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('should shuffle cards (not always in same order)', () => {
      const config = CARD_MATCH_CONFIGS.easy
      const results: string[] = []
      
      // 生成多次，確認順序有變化
      for (let i = 0; i < 10; i++) {
        const cards = generateCards(config)
        results.push(cards.map(c => c.emoji).join(''))
      }
      
      // 至少有些排列應該不同
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThan(1)
    })
  })

  describe('checkMatch', () => {
    it('should return true for matching cards', () => {
      const card1: Card = { id: 0, emoji: '🍎', pairId: 1, isFlipped: true, isMatched: false }
      const card2: Card = { id: 1, emoji: '🍎', pairId: 1, isFlipped: true, isMatched: false }
      
      expect(checkMatch(card1, card2)).toBe(true)
    })

    it('should return false for non-matching cards', () => {
      const card1: Card = { id: 0, emoji: '🍎', pairId: 1, isFlipped: true, isMatched: false }
      const card2: Card = { id: 2, emoji: '🍊', pairId: 2, isFlipped: true, isMatched: false }
      
      expect(checkMatch(card1, card2)).toBe(false)
    })

    it('should return false for same card', () => {
      const card: Card = { id: 0, emoji: '🍎', pairId: 1, isFlipped: true, isMatched: false }
      
      expect(checkMatch(card, card)).toBe(false)
    })
  })

  describe('flipCard', () => {
    it('should flip the specified card', () => {
      const cards: Card[] = [
        { id: 0, emoji: '🍎', pairId: 0, isFlipped: false, isMatched: false },
        { id: 1, emoji: '🍊', pairId: 1, isFlipped: false, isMatched: false },
      ]
      
      const result = flipCard(cards, 0)
      
      expect(result[0]!.isFlipped).toBe(true)
      expect(result[1]!.isFlipped).toBe(false)
    })

    it('should not mutate original array', () => {
      const cards: Card[] = [
        { id: 0, emoji: '🍎', pairId: 0, isFlipped: false, isMatched: false },
      ]
      
      flipCard(cards, 0)
      
      expect(cards[0]!.isFlipped).toBe(false)
    })
  })

  describe('unflipCards', () => {
    it('should unflip specified cards', () => {
      const cards: Card[] = [
        { id: 0, emoji: '🍎', pairId: 0, isFlipped: true, isMatched: false },
        { id: 1, emoji: '🍊', pairId: 1, isFlipped: true, isMatched: false },
        { id: 2, emoji: '🍋', pairId: 2, isFlipped: true, isMatched: false },
      ]
      
      const result = unflipCards(cards, [0, 2])
      
      expect(result[0]!.isFlipped).toBe(false)
      expect(result[1]!.isFlipped).toBe(true)
      expect(result[2]!.isFlipped).toBe(false)
    })
  })

  describe('markMatched', () => {
    it('should mark specified cards as matched', () => {
      const cards: Card[] = [
        { id: 0, emoji: '🍎', pairId: 0, isFlipped: true, isMatched: false },
        { id: 1, emoji: '🍎', pairId: 0, isFlipped: true, isMatched: false },
      ]
      
      const result = markMatched(cards, [0, 1])
      
      expect(result[0]!.isMatched).toBe(true)
      expect(result[1]!.isMatched).toBe(true)
    })
  })

  describe('showAllCards', () => {
    it('should flip all cards', () => {
      const cards: Card[] = [
        { id: 0, emoji: '🍎', pairId: 0, isFlipped: false, isMatched: false },
        { id: 1, emoji: '🍊', pairId: 1, isFlipped: false, isMatched: false },
      ]
      
      const result = showAllCards(cards)
      
      expect(result.every(c => c.isFlipped)).toBe(true)
    })
  })

  describe('hideUnmatchedCards', () => {
    it('should hide only unmatched cards', () => {
      const cards: Card[] = [
        { id: 0, emoji: '🍎', pairId: 0, isFlipped: true, isMatched: true },
        { id: 1, emoji: '🍊', pairId: 1, isFlipped: true, isMatched: false },
      ]
      
      const result = hideUnmatchedCards(cards)
      
      expect(result[0]!.isFlipped).toBe(true)  // matched, stays flipped
      expect(result[1]!.isFlipped).toBe(false) // not matched, hidden
    })
  })

  describe('calculateScore', () => {
    it('should give full score for perfect game', () => {
      const pairs = 6
      const idealMoves = pairs * 2 // 12 moves
      const fastTime = pairs * 5    // 30 seconds
      
      const score = calculateScore(pairs, pairs, idealMoves, fastTime)
      
      // 完成度 50 + 效率 30 + 時間 20 = 100（近似）
      expect(score).toBeGreaterThan(80)
    })

    it('should reduce score for extra moves', () => {
      const pairs = 6
      const goodScore = calculateScore(pairs, pairs, 15, 60)
      const badScore = calculateScore(pairs, pairs, 30, 60)
      
      expect(goodScore).toBeGreaterThan(badScore)
    })

    it('should reduce score for slower time', () => {
      const pairs = 6
      const fastScore = calculateScore(pairs, pairs, 12, 30)
      const slowScore = calculateScore(pairs, pairs, 12, 120)
      
      expect(fastScore).toBeGreaterThan(slowScore)
    })

    it('should handle partial completion', () => {
      const score = calculateScore(3, 6, 10, 60)
      
      // 半途完成的分數會比完整完成低
      const fullScore = calculateScore(6, 6, 10, 60)
      expect(score).toBeLessThan(fullScore)
    })
  })

  describe('calculateGrade', () => {
    it('should return S for excellent performance', () => {
      const grade = calculateGrade(95, 12, 6) // Perfect moves
      expect(grade).toBe('S')
    })

    it('should return lower grades for worse performance', () => {
      // 測試較差表現得到較低等級
      const gradeGood = calculateGrade(85, 15, 6)
      const gradeBad = calculateGrade(40, 40, 6)
      
      // 好的表現應該得到 S, A, 或 B
      expect(['S', 'A', 'B']).toContain(gradeGood)
      // 差的表現應該得到 C, D, 或 F
      expect(['C', 'D', 'F']).toContain(gradeBad)
    })
  })

  describe('summarizeResult', () => {
    it('should summarize game result correctly', () => {
      const result = summarizeResult(6, 6, 14, 45)
      
      expect(result.matchedPairs).toBe(6)
      expect(result.totalPairs).toBe(6)
      expect(result.moves).toBe(14)
      expect(result.duration).toBe(45)
      expect(result.isComplete).toBe(true)
      expect(result.avgMoveTime).toBeGreaterThan(0)
      expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(result.grade)
    })

    it('should mark incomplete game', () => {
      const result = summarizeResult(3, 6, 10, 60)
      
      expect(result.isComplete).toBe(false)
    })
  })

  describe('getGridClass', () => {
    it('should return correct grid class', () => {
      expect(getGridClass(3)).toBe('grid-cols-3')
      expect(getGridClass(4)).toBe('grid-cols-4')
      expect(getGridClass(6)).toBe('grid-cols-6')
    })
  })

  describe('CARD_MATCH_CONFIGS', () => {
    it('should have valid difficulty configs', () => {
      expect(CARD_MATCH_CONFIGS.easy.pairs).toBeLessThan(CARD_MATCH_CONFIGS.medium.pairs)
      expect(CARD_MATCH_CONFIGS.medium.pairs).toBeLessThan(CARD_MATCH_CONFIGS.hard.pairs)
      
      expect(CARD_MATCH_CONFIGS.easy.previewTime).toBeGreaterThan(CARD_MATCH_CONFIGS.hard.previewTime)
    })
  })
})

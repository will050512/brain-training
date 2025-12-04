/**
 * 撲克記憶遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  generateCards,
  flipCard,
  flipAllCards,
  coverAllCards,
  coverCards,
  checkMatch,
  markAsMatched,
  getFlippedCards,
  isGameComplete,
  getMatchedCount,
  calculatePairScore,
  calculateMaxScore,
  calculateGrade,
  summarizeResult,
  formatTime,
  DIFFICULTY_CONFIGS,
  SUITS,
  RANKS,
} from '../pokerMemory'

describe('撲克記憶遊戲邏輯', () => {
  describe('generateCards', () => {
    it('應產生正確數量的卡片', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const cards = generateCards(config)
      expect(cards.length).toBe(config.pairs * 2)
    })

    it('卡片應成對出現', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const cards = generateCards(config)
      const cardCounts = new Map<string, number>()

      cards.forEach(card => {
        const key = `${card.suit}-${card.rank}`
        cardCounts.set(key, (cardCounts.get(key) || 0) + 1)
      })

      cardCounts.forEach(count => {
        expect(count).toBe(2)
      })
    })

    it('所有卡片應該是背面朝上', () => {
      const cards = generateCards(DIFFICULTY_CONFIGS.easy)
      cards.forEach(card => {
        expect(card.isFlipped).toBe(false)
        expect(card.isMatched).toBe(false)
      })
    })

    it('每張卡片應有唯一 ID', () => {
      const cards = generateCards(DIFFICULTY_CONFIGS.easy)
      const ids = cards.map(c => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(cards.length)
    })
  })

  describe('flipCard', () => {
    it('應翻轉指定的卡片', () => {
      const cards = generateCards(DIFFICULTY_CONFIGS.easy)
      const firstCard = cards[0]!
      const updated = flipCard(cards, firstCard.id)
      const flippedCard = updated.find(c => c.id === firstCard.id)
      expect(flippedCard?.isFlipped).toBe(true)
    })

    it('其他卡片不應受影響', () => {
      const cards = generateCards(DIFFICULTY_CONFIGS.easy)
      const firstCard = cards[0]!
      const updated = flipCard(cards, firstCard.id)
      
      updated.forEach(card => {
        if (card.id !== firstCard.id) {
          expect(card.isFlipped).toBe(false)
        }
      })
    })
  })

  describe('flipAllCards / coverAllCards', () => {
    it('flipAllCards 應翻開所有卡片', () => {
      const cards = generateCards(DIFFICULTY_CONFIGS.easy)
      const flipped = flipAllCards(cards)
      flipped.forEach(card => {
        expect(card.isFlipped).toBe(true)
      })
    })

    it('coverAllCards 應蓋上未配對的卡片', () => {
      let cards = generateCards(DIFFICULTY_CONFIGS.easy)
      cards = flipAllCards(cards)
      const covered = coverAllCards(cards)
      covered.forEach(card => {
        if (!card.isMatched) {
          expect(card.isFlipped).toBe(false)
        }
      })
    })
  })

  describe('coverCards', () => {
    it('應蓋上指定的卡片', () => {
      let cards = generateCards(DIFFICULTY_CONFIGS.easy)
      cards = flipCard(cards, cards[0]!.id)
      cards = flipCard(cards, cards[1]!.id)
      const covered = coverCards(cards, [cards[0]!.id])
      expect(covered.find(c => c.id === cards[0]!.id)?.isFlipped).toBe(false)
      expect(covered.find(c => c.id === cards[1]!.id)?.isFlipped).toBe(true)
    })
  })

  describe('checkMatch', () => {
    it('相同的卡片應配對成功', () => {
      const cards = generateCards(DIFFICULTY_CONFIGS.easy)
      // 找到一對相同的卡片
      const firstCard = cards[0]!
      const matchingCard = cards.find(
        c => c.id !== firstCard.id &&
        c.suit === firstCard.suit &&
        c.rank === firstCard.rank
      )!

      const result = checkMatch(firstCard, matchingCard)
      expect(result).toBe(true)
    })

    it('不同的卡片應配對失敗', () => {
      const cards = generateCards(DIFFICULTY_CONFIGS.easy)
      // 找到兩張不同的卡片
      const firstCard = cards[0]!
      const differentCard = cards.find(
        c => c.suit !== firstCard.suit || c.rank !== firstCard.rank
      )!

      const result = checkMatch(firstCard, differentCard)
      expect(result).toBe(false)
    })
  })

  describe('markAsMatched', () => {
    it('應標記指定卡片為已配對', () => {
      const cards = generateCards(DIFFICULTY_CONFIGS.easy)
      const marked = markAsMatched(cards, [cards[0]!.id, cards[1]!.id])
      expect(marked.find(c => c.id === cards[0]!.id)?.isMatched).toBe(true)
      expect(marked.find(c => c.id === cards[1]!.id)?.isMatched).toBe(true)
    })
  })

  describe('getFlippedCards', () => {
    it('應返回翻開且未配對的卡片', () => {
      let cards = generateCards(DIFFICULTY_CONFIGS.easy)
      cards = flipCard(cards, cards[0]!.id)
      cards = flipCard(cards, cards[1]!.id)
      const flipped = getFlippedCards(cards)
      expect(flipped.length).toBe(2)
    })
  })

  describe('isGameComplete', () => {
    it('所有卡片配對後應返回 true', () => {
      const cards = generateCards(DIFFICULTY_CONFIGS.easy)
      const allMatched = cards.map(c => ({ ...c, isMatched: true }))
      expect(isGameComplete(allMatched)).toBe(true)
    })

    it('有未配對卡片時應返回 false', () => {
      const cards = generateCards(DIFFICULTY_CONFIGS.easy)
      expect(isGameComplete(cards)).toBe(false)
    })
  })

  describe('getMatchedCount', () => {
    it('應正確計算已配對數量', () => {
      const cards = generateCards(DIFFICULTY_CONFIGS.easy)
      const twoMatched = cards.map((c, i) => ({ ...c, isMatched: i < 4 }))
      expect(getMatchedCount(twoMatched)).toBe(2) // 4 張卡 = 2 對
    })
  })

  describe('calculatePairScore', () => {
    it('應根據剩餘時間和步數計算分數', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const score = calculatePairScore(config, 60, 10)
      expect(score).toBeGreaterThan(config.points)
    })
  })

  describe('calculateMaxScore', () => {
    it('應計算最大可能分數', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const max = calculateMaxScore(config)
      expect(max).toBeGreaterThan(config.pairs * config.points)
    })
  })

  describe('calculateGrade', () => {
    it('應根據分數比例返回等級', () => {
      expect(calculateGrade(95, 100)).toBe('S')
      expect(calculateGrade(85, 100)).toBe('A')
      expect(calculateGrade(75, 100)).toBe('B')
      expect(calculateGrade(65, 100)).toBe('C')
      expect(calculateGrade(50, 100)).toBe('D')
    })
  })

  describe('summarizeResult', () => {
    it('應正確彙整遊戲結果', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const result = summarizeResult(100, config.pairs, 12, 60, config)

      expect(result.matchedPairs).toBe(config.pairs)
      expect(result.totalPairs).toBe(config.pairs)
      expect(result.moves).toBe(12)
      expect(result.timeLeft).toBe(60)
      expect(result.score).toBe(100)
    })
  })

  describe('formatTime', () => {
    it('應正確格式化時間', () => {
      expect(formatTime(65)).toBe('1:05')
      expect(formatTime(120)).toBe('2:00')
      expect(formatTime(5)).toBe('0:05')
    })
  })

  describe('常數定義', () => {
    it('應有四種花色', () => {
      expect(SUITS.length).toBe(4)
    })

    it('應有足夠的點數', () => {
      expect(RANKS.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('難度配置', () => {
    it('簡單難度應有較少配對數', () => {
      expect(DIFFICULTY_CONFIGS.easy.pairs).toBeLessThan(
        DIFFICULTY_CONFIGS.hard.pairs
      )
    })

    it('困難難度應有更多配對數', () => {
      expect(DIFFICULTY_CONFIGS.hard.pairs).toBeGreaterThan(
        DIFFICULTY_CONFIGS.medium.pairs
      )
    })
  })
})

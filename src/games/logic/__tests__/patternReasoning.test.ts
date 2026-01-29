/**
 * 圖案推理遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  createBaseElement,
  generateRotationQuestion,
  generateSequenceQuestion,
  generateTransformQuestion,
  generateAnalogyQuestion,
  generateProgressionQuestion,
  generateQuestion,
  generateQuestions,
  checkAnswer,
  calculateScore,
  calculateGrade,
  calculateTypeAccuracy,
  summarizeResult,
  SHAPES,
  ROTATABLE_SHAPES,
  COLORS,
  SIZES,
  DIFFICULTY_CONFIGS,
} from '../patternReasoning'

const SHAPE_KEY_MAP: Record<string, string> = {
  '●': 'circle',
  '○': 'circle',
  '■': 'square',
  '□': 'square',
  '▲': 'triangle',
  '△': 'triangle',
  '◆': 'diamond',
  '◇': 'diamond',
  '★': 'star',
  '♥': 'heart',
}

function getShapeKey(shape: string): string {
  return SHAPE_KEY_MAP[shape] ?? shape
}

function getOptionSignature(option: { shape: string; color: string; size: string; rotation: number }): string {
  return `${getShapeKey(option.shape)}|${option.color}|${option.size}|${option.rotation}`
}

describe('圖案推理遊戲邏輯', () => {
  describe('createBaseElement', () => {
    it('應產生有效的元素', () => {
      const element = createBaseElement()

      expect(SHAPES).toContain(element.shape)
      expect(COLORS).toContain(element.color)
      expect(SIZES).toContain(element.size)
      expect(element.rotation).toBe(0)
    })
  })

  describe('generateRotationQuestion', () => {
    it('應產生有效的旋轉題目', () => {
      const question = generateRotationQuestion(4)

      expect(question.type).toBe('rotation')
      expect(question.sequence.length).toBe(3)
      expect(question.options.length).toBe(4)
      expect(question.correctIndex).toBeGreaterThanOrEqual(0)
      expect(question.correctIndex).toBeLessThan(4)
    })

    it('正確答案應在選項中', () => {
      const question = generateRotationQuestion(4)
      expect(question.options[question.correctIndex]).toBeDefined()
    })

    it('旋轉題型不應產生視覺等價的圖形', () => {
      const question = generateRotationQuestion(5)
      const shape = question.sequence[0]?.shape

      expect(shape).toBeDefined()
      expect(ROTATABLE_SHAPES).toContain(shape as any)

      const signatures = question.options.map(getOptionSignature)
      expect(new Set(signatures).size).toBe(question.options.length)
    })
  })

  describe('generateSequenceQuestion', () => {
    it('應產生有效的序列題目', () => {
      const question = generateSequenceQuestion(4)

      expect(question.type).toBe('sequence')
      expect(question.sequence.length).toBe(4)
      expect(question.options.length).toBe(4)
    })
  })

  describe('generateTransformQuestion', () => {
    it('應產生有效的變化題目', () => {
      const question = generateTransformQuestion(4)

      expect(question.type).toBe('transform')
      expect(question.sequence.length).toBe(2)
      expect(question.options.length).toBe(4)
    })
  })

  describe('generateAnalogyQuestion', () => {
    it('應產生有效的類比題目', () => {
      const question = generateAnalogyQuestion(4)

      expect(question.type).toBe('analogy')
      expect(question.sequence.length).toBe(3)
      expect(question.options.length).toBe(4)
      expect(question.instruction).toContain('?')
    })
  })

  describe('generateProgressionQuestion', () => {
    it('應產生有效的遞進題目', () => {
      const question = generateProgressionQuestion(4)

      expect(question.type).toBe('progression')
      expect(question.sequence.length).toBe(3)
      expect(question.options.length).toBe(4)
    })

    it('遞進題目應保持形狀與大小一致，避免多重答案', () => {
      const question = generateProgressionQuestion(5)
      const shape = question.sequence[0]?.shape
      const size = question.sequence[0]?.size

      expect(shape).toBeDefined()
      expect(size).toBeDefined()

      question.sequence.forEach(item => {
        expect(item.shape).toBe(shape)
        expect(item.size).toBe(size)
      })

      question.options.forEach(option => {
        expect(option.shape).toBe(shape)
        expect(option.size).toBe(size)
      })

      const signatures = question.options.map(getOptionSignature)
      expect(new Set(signatures).size).toBe(question.options.length)
    })
  })

  describe('generateQuestion', () => {
    it('應根據類型產生正確的題目', () => {
      const types = ['rotation', 'sequence', 'transform', 'analogy', 'progression'] as const

      types.forEach(type => {
        const question = generateQuestion(type, 4)
        expect(question.type).toBe(type)
      })
    })
  })

  describe('generateQuestions', () => {
    it('應產生指定數量的題目', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const questions = generateQuestions(config)

      expect(questions.length).toBe(config.totalQuestions)
    })

    it('題目類型應根據難度配置', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const questions = generateQuestions(config)

      questions.forEach(q => {
        expect(config.patternTypes).toContain(q.type)
      })
    })
  })

  describe('checkAnswer', () => {
    it('選擇正確答案應返回 true', () => {
      const question = generateRotationQuestion(4)
      expect(checkAnswer(question, question.correctIndex)).toBe(true)
    })

    it('選擇錯誤答案應返回 false', () => {
      const question = generateRotationQuestion(4)
      const wrongIndex = (question.correctIndex + 1) % 4
      expect(checkAnswer(question, wrongIndex)).toBe(false)
    })
  })

  describe('calculateScore', () => {
    it('應根據正確率計算分數', () => {
      const score = calculateScore(5, 10, 15, 30)
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('完美表現應得高分', () => {
      const score = calculateScore(10, 10, 10, 30)
      expect(score).toBeGreaterThan(80)
    })

    it('較快完成應有時間獎勵', () => {
      const fastScore = calculateScore(10, 10, 10, 30)
      const slowScore = calculateScore(10, 10, 25, 30)
      expect(fastScore).toBeGreaterThan(slowScore)
    })
  })

  describe('calculateGrade', () => {
    it('應根據分數返回等級', () => {
      expect(calculateGrade(95)).toBe('S')
      expect(calculateGrade(85)).toBe('A')
      expect(calculateGrade(75)).toBe('B')
      expect(calculateGrade(65)).toBe('C')
      expect(calculateGrade(50)).toBe('D')
    })
  })

  describe('calculateTypeAccuracy', () => {
    it('應計算各類型的準確率', () => {
      const questions = [
        { type: 'rotation' as const, sequence: [], correctIndex: 0, options: [], instruction: '' },
        { type: 'rotation' as const, sequence: [], correctIndex: 0, options: [], instruction: '' },
        { type: 'sequence' as const, sequence: [], correctIndex: 0, options: [], instruction: '' },
      ]
      const answers = [true, false, true]

      const accuracy = calculateTypeAccuracy(questions, answers)

      expect(accuracy.rotation).toBe(50) // 1/2
      expect(accuracy.sequence).toBe(100) // 1/1
    })

    it('沒有該類型題目應返回 0', () => {
      const questions = [
        { type: 'rotation' as const, sequence: [], correctIndex: 0, options: [], instruction: '' },
      ]
      const answers = [true]

      const accuracy = calculateTypeAccuracy(questions, answers)
      expect(accuracy.sequence).toBe(0)
    })
  })

  describe('summarizeResult', () => {
    it('應正確彙整結果', () => {
      const config = DIFFICULTY_CONFIGS.easy
      const questions = generateQuestions(config)
      const answers = questions.map(() => true)
      const times = questions.map(() => 10)

      const result = summarizeResult(questions, answers, times, config)

      expect(result.correct).toBe(questions.length)
      expect(result.total).toBe(questions.length)
      expect(result.accuracy).toBe(100)
    })
  })

  describe('常數定義', () => {
    it('應有足夠的形狀', () => {
      expect(SHAPES.length).toBeGreaterThanOrEqual(6)
    })

    it('應有足夠的顏色', () => {
      expect(COLORS.length).toBeGreaterThanOrEqual(6)
    })

    it('應有三種尺寸', () => {
      expect(SIZES.length).toBe(3)
    })
  })

  describe('難度配置', () => {
    it('簡單難度應有較少選項', () => {
      expect(DIFFICULTY_CONFIGS.easy.optionCount).toBeLessThanOrEqual(
        DIFFICULTY_CONFIGS.hard.optionCount
      )
    })

    it('困難難度應有更多題目類型', () => {
      expect(DIFFICULTY_CONFIGS.hard.patternTypes.length).toBeGreaterThan(
        DIFFICULTY_CONFIGS.easy.patternTypes.length
      )
    })

    it('困難難度應有更多題目', () => {
      expect(DIFFICULTY_CONFIGS.hard.totalQuestions).toBeGreaterThanOrEqual(
        DIFFICULTY_CONFIGS.easy.totalQuestions
      )
    })
  })
})

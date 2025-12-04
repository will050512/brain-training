/**
 * 數學計算遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  generateQuestion,
  generateAllQuestions,
  generateOptions,
  validateAnswer,
  calculateQuestionScore,
  calculateGrade,
  calculateMaxScore,
  summarizeResult,
  MATH_CALC_CONFIGS,
  type MathQuestion,
  type MathCalcConfig
} from '../mathCalc'

describe('MathCalc Logic', () => {
  describe('generateQuestion', () => {
    it('should generate a valid addition question', () => {
      const config: MathCalcConfig = {
        ...MATH_CALC_CONFIGS.easy,
        operations: ['+'],
      }
      
      const question = generateQuestion(config, 1)
      
      expect(question.id).toBe(1)
      expect(question.operation).toBe('+')
      expect(question.answer).toBe(question.num1 + question.num2)
      expect(question.options).toHaveLength(4)
      expect(question.options).toContain(question.answer)
    })

    it('should generate a valid subtraction question with positive result', () => {
      const config: MathCalcConfig = {
        ...MATH_CALC_CONFIGS.easy,
        operations: ['-'],
      }
      
      for (let i = 0; i < 10; i++) {
        const question = generateQuestion(config, i)
        expect(question.answer).toBe(question.num1 - question.num2)
        expect(question.answer).toBeGreaterThanOrEqual(0)
      }
    })

    it('should generate a valid multiplication question', () => {
      const config: MathCalcConfig = {
        ...MATH_CALC_CONFIGS.medium,
        operations: ['×'],
      }
      
      const question = generateQuestion(config, 1)
      
      expect(question.operation).toBe('×')
      expect(question.answer).toBe(question.num1 * question.num2)
      expect(question.num1).toBeLessThanOrEqual(12)
      expect(question.num2).toBeLessThanOrEqual(12)
    })

    it('should generate a valid division question with integer result', () => {
      const config: MathCalcConfig = {
        ...MATH_CALC_CONFIGS.hard,
        operations: ['÷'],
      }
      
      for (let i = 0; i < 10; i++) {
        const question = generateQuestion(config, i)
        expect(question.operation).toBe('÷')
        expect(question.num1 / question.num2).toBe(question.answer)
        expect(Number.isInteger(question.answer)).toBe(true)
      }
    })
  })

  describe('generateAllQuestions', () => {
    it('should generate correct number of questions', () => {
      const config = MATH_CALC_CONFIGS.easy
      const questions = generateAllQuestions(config)
      
      expect(questions).toHaveLength(config.questionsCount)
      questions.forEach((q, i) => {
        expect(q.id).toBe(i + 1)
      })
    })
  })

  describe('generateOptions', () => {
    it('should generate 4 unique options including correct answer', () => {
      for (let i = 0; i < 20; i++) {
        const correctAnswer = Math.floor(Math.random() * 100) + 1
        const options = generateOptions(correctAnswer)
        
        expect(options).toHaveLength(4)
        expect(options).toContain(correctAnswer)
        expect(new Set(options).size).toBe(4) // All unique
      }
    })

    it('should generate positive options', () => {
      const options = generateOptions(5)
      options.forEach(opt => {
        expect(opt).toBeGreaterThan(0)
      })
    })
  })

  describe('validateAnswer', () => {
    it('should return true for correct answer', () => {
      const question: MathQuestion = {
        id: 1,
        num1: 5,
        num2: 3,
        operation: '+',
        answer: 8,
        options: [6, 7, 8, 9],
      }
      
      expect(validateAnswer(question, 8)).toBe(true)
    })

    it('should return false for incorrect answer', () => {
      const question: MathQuestion = {
        id: 1,
        num1: 5,
        num2: 3,
        operation: '+',
        answer: 8,
        options: [6, 7, 8, 9],
      }
      
      expect(validateAnswer(question, 7)).toBe(false)
    })
  })

  describe('calculateQuestionScore', () => {
    const config = MATH_CALC_CONFIGS.easy

    it('should return 0 for incorrect answer', () => {
      expect(calculateQuestionScore(false, 1000, config, 0)).toBe(0)
    })

    it('should return base points for slow correct answer', () => {
      const score = calculateQuestionScore(true, 10000, config, 0)
      expect(score).toBe(config.basePoints) // No time bonus
    })

    it('should add time bonus for fast answer', () => {
      const slowScore = calculateQuestionScore(true, 5000, config, 0)
      const fastScore = calculateQuestionScore(true, 1000, config, 0)
      
      expect(fastScore).toBeGreaterThan(slowScore)
    })

    it('should add combo bonus', () => {
      const noComboScore = calculateQuestionScore(true, 2000, config, 0)
      const comboScore = calculateQuestionScore(true, 2000, config, 5)
      
      expect(comboScore).toBeGreaterThan(noComboScore)
    })
  })

  describe('calculateGrade', () => {
    it('should return S for excellent performance', () => {
      expect(calculateGrade(95, 100, 1.0)).toBe('S')
    })

    it('should return A for great performance', () => {
      expect(calculateGrade(85, 100, 0.9)).toBe('A')
    })

    it('should return B for good performance', () => {
      expect(calculateGrade(70, 100, 0.8)).toBe('B')
    })

    it('should return C for average performance', () => {
      expect(calculateGrade(55, 100, 0.7)).toBe('C')
    })

    it('should return D for below average performance', () => {
      expect(calculateGrade(40, 100, 0.5)).toBe('D')
    })

    it('should return F for poor performance', () => {
      expect(calculateGrade(20, 100, 0.3)).toBe('F')
    })
  })

  describe('calculateMaxScore', () => {
    it('should calculate max score correctly', () => {
      const config = MATH_CALC_CONFIGS.easy
      const maxScore = calculateMaxScore(config)
      
      // Max = questions * (basePoints + maxTimeBonus) + maxComboBonus
      const expectedMax = config.questionsCount * (config.basePoints + 10) + 
                          Math.floor(config.questionsCount * 0.5)
      expect(maxScore).toBe(expectedMax)
    })
  })

  describe('summarizeResult', () => {
    it('should summarize game result correctly', () => {
      const config = MATH_CALC_CONFIGS.easy
      const result = summarizeResult(
        100,  // score
        8,    // correctCount
        2,    // wrongCount
        60,   // duration
        [1000, 1200, 1500, 1100, 900, 1300, 1400, 1000, 1100, 1200], // responseTimes
        5,    // maxCombo
        config
      )
      
      expect(result.score).toBe(100)
      expect(result.correctCount).toBe(8)
      expect(result.wrongCount).toBe(2)
      expect(result.totalCount).toBe(10)
      expect(result.accuracy).toBe(0.8)
      expect(result.duration).toBe(60)
      expect(result.avgResponseTime).toBe(1170)
      expect(result.maxCombo).toBe(5)
      expect(result.responseTimes).toHaveLength(10)
      expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(result.grade)
    })
  })
})


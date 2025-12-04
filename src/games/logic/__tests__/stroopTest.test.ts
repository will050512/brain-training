/**
 * Stroop 測試遊戲邏輯單元測試
 */
import { describe, it, expect } from 'vitest'
import {
  generateQuestion,
  generateAllQuestions,
  generateOptions,
  validateAnswer,
  getCorrectAnswerLabel,
  getModeDescription,
  getDifficultyExplanation,
  getQuestionPrompt,
  calculateScore,
  calculateGrade,
  summarizeResult,
  STROOP_CONFIGS,
  COLORS,
  type StroopQuestion,
  type StroopConfig,
  type QuestionType,
  type GameMode
} from '../stroopTest'

describe('StroopTest Logic', () => {
  describe('generateQuestion', () => {
    it('should generate valid question with required fields', () => {
      const config = STROOP_CONFIGS.easy
      const question = generateQuestion(config, 1)
      
      expect(question.id).toBe(1)
      expect(question.word).toBeTruthy()
      expect(question.wordColorName).toBeTruthy()
      expect(question.inkColor).toMatch(/^#[0-9a-f]{6}$/i)
      expect(question.inkColorName).toBeTruthy()
      expect(question.borderColor).toMatch(/^#[0-9a-f]{6}$/i)
      expect(['ink', 'meaning']).toContain(question.questionType)
      expect(question.correctAnswer).toBeTruthy()
      expect(typeof question.isCongruent).toBe('boolean')
    })

    it('should respect ink mode setting', () => {
      const config: StroopConfig = { ...STROOP_CONFIGS.easy, mode: 'ink' }
      
      for (let i = 0; i < 10; i++) {
        const question = generateQuestion(config, i)
        expect(question.questionType).toBe('ink')
        expect(question.correctAnswer).toBe(question.inkColorName)
      }
    })

    it('should respect meaning mode setting', () => {
      const config: StroopConfig = { ...STROOP_CONFIGS.medium, mode: 'meaning' }
      
      for (let i = 0; i < 10; i++) {
        const question = generateQuestion(config, i)
        expect(question.questionType).toBe('meaning')
        expect(question.correctAnswer).toBe(question.wordColorName)
      }
    })

    it('should mix question types in mixed mode', () => {
      const config: StroopConfig = { ...STROOP_CONFIGS.hard, mode: 'mixed' }
      const types = new Set<QuestionType>()
      
      for (let i = 0; i < 20; i++) {
        const question = generateQuestion(config, i)
        types.add(question.questionType)
      }
      
      // 混合模式應該有兩種題型
      expect(types.size).toBe(2)
    })

    it('should generate congruent questions based on config', () => {
      const config: StroopConfig = { 
        ...STROOP_CONFIGS.easy, 
        congruentChance: 1.0 // 100% 一致
      }
      
      for (let i = 0; i < 10; i++) {
        const question = generateQuestion(config, i)
        expect(question.isCongruent).toBe(true)
        expect(question.wordColorName).toBe(question.inkColorName)
      }
    })

    it('should generate incongruent questions when chance is 0', () => {
      const config: StroopConfig = { 
        ...STROOP_CONFIGS.hard, 
        congruentChance: 0 // 0% 一致
      }
      
      for (let i = 0; i < 10; i++) {
        const question = generateQuestion(config, i)
        expect(question.isCongruent).toBe(false)
        expect(question.wordColorName).not.toBe(question.inkColorName)
      }
    })
  })

  describe('generateAllQuestions', () => {
    it('should generate correct number of questions', () => {
      const config = STROOP_CONFIGS.easy
      const questions = generateAllQuestions(config)
      
      expect(questions).toHaveLength(config.rounds)
    })

    it('should assign sequential IDs', () => {
      const config = STROOP_CONFIGS.medium
      const questions = generateAllQuestions(config)
      
      questions.forEach((q, i) => {
        expect(q.id).toBe(i + 1)
      })
    })
  })

  describe('generateOptions', () => {
    it('should return all 4 color options', () => {
      const options = generateOptions()
      
      expect(options).toHaveLength(4)
    })

    it('should contain all colors', () => {
      const options = generateOptions()
      const names = options.map(o => o.name).sort()
      const expectedNames = COLORS.map(c => c.name).sort()
      
      expect(names).toEqual(expectedNames)
    })

    it('should shuffle options (randomized order)', () => {
      const results: string[] = []
      
      for (let i = 0; i < 20; i++) {
        const options = generateOptions()
        results.push(options.map(o => o.name).join(','))
      }
      
      // 應該有不同的排列
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThan(1)
    })
  })

  describe('validateAnswer', () => {
    it('should return true for correct ink answer', () => {
      const question: StroopQuestion = {
        id: 1,
        word: '紅色',
        wordColorName: 'red',
        inkColor: '#3b82f6',
        inkColorName: 'blue',
        borderColor: '#22c55e',
        questionType: 'ink',
        correctAnswer: 'blue',
        isCongruent: false
      }
      
      expect(validateAnswer(question, 'blue')).toBe(true)
    })

    it('should return true for correct meaning answer', () => {
      const question: StroopQuestion = {
        id: 1,
        word: '紅色',
        wordColorName: 'red',
        inkColor: '#3b82f6',
        inkColorName: 'blue',
        borderColor: '#22c55e',
        questionType: 'meaning',
        correctAnswer: 'red',
        isCongruent: false
      }
      
      expect(validateAnswer(question, 'red')).toBe(true)
    })

    it('should return false for incorrect answer', () => {
      const question: StroopQuestion = {
        id: 1,
        word: '紅色',
        wordColorName: 'red',
        inkColor: '#3b82f6',
        inkColorName: 'blue',
        borderColor: '#22c55e',
        questionType: 'ink',
        correctAnswer: 'blue',
        isCongruent: false
      }
      
      expect(validateAnswer(question, 'red')).toBe(false)
      expect(validateAnswer(question, 'green')).toBe(false)
    })
  })

  describe('getCorrectAnswerLabel', () => {
    it('should return Chinese label for correct answer', () => {
      const question: StroopQuestion = {
        id: 1,
        word: '紅色',
        wordColorName: 'red',
        inkColor: '#3b82f6',
        inkColorName: 'blue',
        borderColor: '#22c55e',
        questionType: 'ink',
        correctAnswer: 'blue',
        isCongruent: false
      }
      
      expect(getCorrectAnswerLabel(question)).toBe('藍色')
    })
  })

  describe('getModeDescription', () => {
    it('should return appropriate descriptions', () => {
      expect(getModeDescription('ink')).toContain('顏色')
      expect(getModeDescription('meaning')).toContain('意思')
      expect(getModeDescription('mixed')).toContain('切換')
    })
  })

  describe('getDifficultyExplanation', () => {
    it('should return difficulty explanations', () => {
      expect(getDifficultyExplanation('ink')).toContain('簡單')
      expect(getDifficultyExplanation('meaning')).toContain('中等')
      expect(getDifficultyExplanation('mixed')).toContain('困難')
    })
  })

  describe('getQuestionPrompt', () => {
    it('should return ink prompt', () => {
      const prompt = getQuestionPrompt('ink')
      expect(prompt.icon).toBe('🎨')
      expect(prompt.text).toContain('顏色')
    })

    it('should return meaning prompt', () => {
      const prompt = getQuestionPrompt('meaning')
      expect(prompt.icon).toBe('📝')
      expect(prompt.text).toContain('意思')
    })
  })

  describe('calculateScore', () => {
    it('should give full score for perfect accuracy and speed', () => {
      const score = calculateScore(10, 10, 500) // 100% 正確，平均 500ms
      
      expect(score).toBeGreaterThan(90)
    })

    it('should reduce score for lower accuracy', () => {
      const perfectScore = calculateScore(10, 10, 1000)
      const halfScore = calculateScore(5, 10, 1000)
      
      expect(perfectScore).toBeGreaterThan(halfScore)
    })

    it('should add speed bonus for fast responses', () => {
      const fastScore = calculateScore(10, 10, 500)
      const slowScore = calculateScore(10, 10, 3000)
      
      expect(fastScore).toBeGreaterThan(slowScore)
    })

    it('should cap score at 100', () => {
      const score = calculateScore(10, 10, 100) // Very fast
      
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  describe('calculateGrade', () => {
    it('should return S for excellent performance', () => {
      const grade = calculateGrade(95, 1.0, 500)
      expect(grade).toBe('S')
    })

    it('should return lower grades for worse performance', () => {
      const gradeA = calculateGrade(85, 0.9, 1000)
      const gradeB = calculateGrade(70, 0.7, 1500)
      const gradeC = calculateGrade(55, 0.6, 2000)
      
      expect(['S', 'A']).toContain(gradeA)
      expect(['A', 'B', 'C']).toContain(gradeB)
      expect(['B', 'C', 'D']).toContain(gradeC)
    })

    it('should return F for poor performance', () => {
      const grade = calculateGrade(20, 0.2, 5000)
      expect(['D', 'F']).toContain(grade)
    })
  })

  describe('summarizeResult', () => {
    it('should summarize game result correctly', () => {
      const config = STROOP_CONFIGS.easy
      const result = summarizeResult(
        8,    // correctCount
        10,   // totalCount
        [800, 900, 1000, 850, 950, 1100, 900, 800, 1050, 950], // reactionTimes
        config,
        5,    // congruentCorrect
        3     // incongruentCorrect
      )
      
      expect(result.correctCount).toBe(8)
      expect(result.totalCount).toBe(10)
      expect(result.accuracy).toBe(0.8)
      expect(result.avgReactionTime).toBeGreaterThan(0)
      expect(result.congruentCorrect).toBe(5)
      expect(result.incongruentCorrect).toBe(3)
      expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(result.grade)
    })

    it('should handle empty reaction times', () => {
      const config = STROOP_CONFIGS.easy
      const result = summarizeResult(0, 0, [], config)
      
      expect(result.avgReactionTime).toBe(0)
      expect(result.accuracy).toBe(0)
    })
  })

  describe('STROOP_CONFIGS', () => {
    it('should have increasing difficulty', () => {
      expect(STROOP_CONFIGS.easy.rounds).toBeLessThan(STROOP_CONFIGS.medium.rounds)
      expect(STROOP_CONFIGS.medium.rounds).toBeLessThan(STROOP_CONFIGS.hard.rounds)
      
      expect(STROOP_CONFIGS.easy.timePerRound).toBeGreaterThan(STROOP_CONFIGS.hard.timePerRound)
      expect(STROOP_CONFIGS.easy.congruentChance).toBeGreaterThan(STROOP_CONFIGS.hard.congruentChance)
    })

    it('should have correct modes', () => {
      expect(STROOP_CONFIGS.easy.mode).toBe('ink')
      expect(STROOP_CONFIGS.medium.mode).toBe('meaning')
      expect(STROOP_CONFIGS.hard.mode).toBe('mixed')
    })
  })

  describe('COLORS', () => {
    it('should have 4 colors', () => {
      expect(COLORS).toHaveLength(4)
    })

    it('should have required properties', () => {
      COLORS.forEach(color => {
        expect(color.name).toBeTruthy()
        expect(color.label).toBeTruthy()
        expect(color.value).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })

    it('should have unique names', () => {
      const names = COLORS.map(c => c.name)
      expect(new Set(names).size).toBe(names.length)
    })
  })
})

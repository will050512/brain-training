/**
 * 圖案推理遊戲邏輯模組
 * 訓練：邏輯推理、模式識別、抽象思維
 */

import type { Difficulty } from '@/types/game'

// ==================== 類型定義 ====================

export type PatternType = 'rotation' | 'sequence' | 'transform' | 'analogy' | 'progression'

export interface PatternElement {
  shape: string
  color: string
  size: 'small' | 'medium' | 'large'
  rotation: number
}

export interface PatternQuestion {
  /** 題目類型 */
  type: PatternType
  /** 序列元素 */
  sequence: PatternElement[]
  /** 正確答案索引 */
  correctIndex: number
  /** 選項 */
  options: PatternElement[]
  /** 題目說明 */
  instruction: string
}

export interface PatternReasoningConfig {
  /** 總題數 */
  totalQuestions: number
  /** 每題時間限制（秒） */
  timePerQuestion: number
  /** 題目類型 */
  patternTypes: PatternType[]
  /** 選項數量 */
  optionCount: number
}

export interface PatternReasoningResult {
  /** 最終分數 */
  score: number
  /** 準確率 */
  accuracy: number
  /** 正確題數 */
  correct: number
  /** 總題數 */
  total: number
  /** 平均答題時間（秒） */
  avgTime: number
  /** 各類型正確率 */
  typeAccuracy: Record<PatternType, number>
}

// ==================== 常數配置 ====================

export const SHAPES = ['●', '■', '▲', '◆', '★', '♥', '○', '□', '△', '◇']
// 用於「旋轉」題型：避免選到旋轉後外觀不變的圖形（如圓/方/菱形等），造成選項看起來一樣而無法作答
export const ROTATABLE_SHAPES = ['▲', '△'] as const
export const COLORS = [
  '#E53E3E', // 紅
  '#3182CE', // 藍
  '#38A169', // 綠
  '#D69E2E', // 黃
  '#805AD5', // 紫
  '#DD6B20', // 橘
  '#319795', // 青
  '#D53F8C', // 粉紅
]
// 遞進題型使用：同色系由淺到深，降低判斷歧義
export const PROGRESSION_COLORS = [
  '#EBF8FF',
  '#BEE3F8',
  '#90CDF4',
  '#63B3ED',
  '#4299E1',
  '#3182CE',
  '#2B6CB0',
  '#2C5282',
]
export const SIZES: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large']
export const ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315]

export const DIFFICULTY_CONFIGS: Record<Difficulty, PatternReasoningConfig> = {
  easy: {
    totalQuestions: 8,
    timePerQuestion: 30,
    patternTypes: ['sequence', 'rotation'],
    optionCount: 3,
  },
  medium: {
    totalQuestions: 10,
    timePerQuestion: 25,
    patternTypes: ['sequence', 'rotation', 'transform'],
    optionCount: 4,
  },
  hard: {
    totalQuestions: 12,
    timePerQuestion: 20,
    patternTypes: ['sequence', 'rotation', 'transform', 'analogy', 'progression'],
    optionCount: 5,
  },
}

// ==================== 工具函數 ====================

/**
 * 取得隨機元素
 */
function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

/**
 * 打亂陣列
 */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]!
    result[j] = temp!
  }
  return result
}

function getOptionSignature(option: PatternElement): string {
  return `${option.shape}|${option.color}|${option.size}|${option.rotation}`
}

function isQuestionValid(question: PatternQuestion, optionCount: number): boolean {
  if (question.options.length !== optionCount) return false
  if (question.correctIndex < 0 || question.correctIndex >= question.options.length) return false

  const signatures = question.options.map(getOptionSignature)
  return new Set(signatures).size === signatures.length
}

/**
 * 產生基礎元素
 */
export function createBaseElement(shapePool: readonly string[] = SHAPES): PatternElement {
  return {
    shape: randomFrom(shapePool),
    color: randomFrom(COLORS),
    size: randomFrom(SIZES),
    rotation: 0,
  }
}

/**
 * 產生旋轉題目
 */
export function generateRotationQuestion(optionCount: number): PatternQuestion {
  const base = createBaseElement(ROTATABLE_SHAPES)
  const rotationStep = 90
  const sequence: PatternElement[] = []

  for (let i = 0; i < 3; i++) {
    sequence.push({
      ...base,
      rotation: (i * rotationStep) % 360,
    })
  }

  // 正確答案
  const answer: PatternElement = {
    ...base,
    rotation: (3 * rotationStep) % 360,
  }

  // 產生錯誤選項
  const wrongOptions: PatternElement[] = []
  // 避免錯誤選項與題目序列重複，降低誤判（長者容易被「看過的圖形」干擾）
  const usedRotations = new Set<number>([answer.rotation, ...sequence.map(s => s.rotation)])

  while (wrongOptions.length < optionCount - 1) {
    const rotation = randomFrom(ROTATIONS)
    if (!usedRotations.has(rotation)) {
      usedRotations.add(rotation)
      wrongOptions.push({ ...base, rotation })
    }
  }

  const options = shuffle([answer, ...wrongOptions])
  const correctIndex = options.findIndex(o => o.rotation === answer.rotation)

  return {
    type: 'rotation',
    sequence,
    correctIndex,
    options,
    instruction: '請選擇下一個圖案',
  }
}

/**
 * 產生序列題目（形狀循環）
 */
export function generateSequenceQuestion(optionCount: number): PatternQuestion {
  const shapes = shuffle([...SHAPES]).slice(0, 3)
  const color = randomFrom(COLORS)
  const size = randomFrom(SIZES)

  const sequence: PatternElement[] = shapes.map(shape => ({
    shape,
    color,
    size,
    rotation: 0,
  }))

  // 重複一次序列
  sequence.push({ ...sequence[0]! })

  // 正確答案是序列的第二個元素
  const answer = { ...sequence[1]! }

  // 產生錯誤選項
  const wrongOptions: PatternElement[] = []
  const usedShapes = new Set([answer.shape])

  while (wrongOptions.length < optionCount - 1) {
    const shape = randomFrom(SHAPES)
    if (!usedShapes.has(shape)) {
      usedShapes.add(shape)
      wrongOptions.push({ shape, color, size, rotation: 0 })
    }
  }

  const options = shuffle([answer, ...wrongOptions])
  const correctIndex = options.findIndex(o => o.shape === answer.shape)

  return {
    type: 'sequence',
    sequence,
    correctIndex,
    options,
    instruction: '請選擇下一個圖案',
  }
}

/**
 * 產生變化題目（大小變化）
 */
export function generateTransformQuestion(optionCount: number): PatternQuestion {
  const shape = randomFrom(SHAPES)
  const color = randomFrom(COLORS)
  const sizeOrder: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large']

  const sequence: PatternElement[] = sizeOrder.slice(0, 2).map(size => ({
    shape,
    color,
    size,
    rotation: 0,
  }))

  // 正確答案是 large
  const answer: PatternElement = {
    shape,
    color,
    size: 'large',
    rotation: 0,
  }

  // 產生錯誤選項（不同形狀）
  const wrongOptions: PatternElement[] = []
  const usedShapes = new Set([shape])

  while (wrongOptions.length < optionCount - 1) {
    const wrongShape = randomFrom(SHAPES)
    if (!usedShapes.has(wrongShape)) {
      usedShapes.add(wrongShape)
      wrongOptions.push({
        shape: wrongShape,
        color,
        size: 'large',
        rotation: 0,
      })
    }
  }

  const options = shuffle([answer, ...wrongOptions])
  const correctIndex = options.findIndex(o => o.shape === answer.shape)

  return {
    type: 'transform',
    sequence,
    correctIndex,
    options,
    instruction: '請選擇下一個圖案',
  }
}

/**
 * 產生類比題目
 */
export function generateAnalogyQuestion(optionCount: number): PatternQuestion {
  const shapes = shuffle([...SHAPES]).slice(0, 4)
  const colors = shuffle([...COLORS]).slice(0, 2)

  // A : B = C : ?
  // 例：紅圓 : 紅方 = 藍圓 : 藍方
  const sequence: PatternElement[] = [
    { shape: shapes[0]!, color: colors[0]!, size: 'medium', rotation: 0 },
    { shape: shapes[1]!, color: colors[0]!, size: 'medium', rotation: 0 },
    { shape: shapes[0]!, color: colors[1]!, size: 'medium', rotation: 0 },
  ]

  // 正確答案
  const answer: PatternElement = {
    shape: shapes[1]!,
    color: colors[1]!,
    size: 'medium',
    rotation: 0,
  }

  // 產生錯誤選項
  const wrongOptions: PatternElement[] = []
  const usedCombos = new Set([`${answer.shape}-${answer.color}`])

  while (wrongOptions.length < optionCount - 1) {
    const wrongShape = randomFrom(SHAPES)
    const wrongColor = randomFrom(COLORS)
    const combo = `${wrongShape}-${wrongColor}`
    if (!usedCombos.has(combo)) {
      usedCombos.add(combo)
      wrongOptions.push({
        shape: wrongShape,
        color: wrongColor,
        size: 'medium',
        rotation: 0,
      })
    }
  }

  const options = shuffle([answer, ...wrongOptions])
  const correctIndex = options.findIndex(
    o => o.shape === answer.shape && o.color === answer.color
  )

  return {
    type: 'analogy',
    sequence,
    correctIndex,
    options,
    instruction: 'A : B = C : ?，請選擇 ?',
  }
}

/**
 * 產生遞進題目（顏色變深或形狀漸變）
 */
export function generateProgressionQuestion(optionCount: number): PatternQuestion {
  const shape = randomFrom(SHAPES)
  const size: 'small' | 'medium' | 'large' = 'medium'
  const colorIndex = Math.floor(Math.random() * (PROGRESSION_COLORS.length - 3))
  const sequenceColors = PROGRESSION_COLORS.slice(colorIndex, colorIndex + 3)

  const sequence: PatternElement[] = []
  for (const color of sequenceColors) {
    sequence.push({
      shape,
      color,
      size,
      rotation: 0,
    })
  }

  // 僅顏色遞進，避免多重解讀
  const answer: PatternElement = {
    shape,
    color: PROGRESSION_COLORS[colorIndex + 3]!,
    size,
    rotation: 0,
  }

  // 產生錯誤選項
  const usedColors = new Set([...sequenceColors, answer.color])
  const wrongColorPool = PROGRESSION_COLORS.filter(color => !usedColors.has(color))
  const extraColors = COLORS.filter(color => !usedColors.has(color) && !wrongColorPool.includes(color))
  const colorPool = shuffle([...wrongColorPool, ...extraColors]).slice(0, optionCount - 1)
  const wrongOptions = colorPool.map(color => ({
    shape,
    color,
    size,
    rotation: 0,
  }))

  const options = shuffle([answer, ...wrongOptions])
  const correctIndex = options.findIndex(
    o => o.shape === answer.shape && o.color === answer.color && o.size === answer.size
  )

  return {
    type: 'progression',
    sequence,
    correctIndex,
    options,
    instruction: '顏色依序變化，請選擇下一個圖案',
  }
}

/**
 * 根據類型產生題目
 */
export function generateQuestion(
  type: PatternType,
  optionCount: number
): PatternQuestion {
  const buildQuestion = () => {
    switch (type) {
      case 'rotation':
        return generateRotationQuestion(optionCount)
      case 'sequence':
        return generateSequenceQuestion(optionCount)
      case 'transform':
        return generateTransformQuestion(optionCount)
      case 'analogy':
        return generateAnalogyQuestion(optionCount)
      case 'progression':
        return generateProgressionQuestion(optionCount)
      default:
        return generateSequenceQuestion(optionCount)
    }
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const question = buildQuestion()
    if (isQuestionValid(question, optionCount)) {
      return question
    }
  }

  return buildQuestion()
}

/**
 * 產生題目集
 */
export function generateQuestions(config: PatternReasoningConfig): PatternQuestion[] {
  const questions: PatternQuestion[] = []

  for (let i = 0; i < config.totalQuestions; i++) {
    const type = config.patternTypes[i % config.patternTypes.length]!
    questions.push(generateQuestion(type, config.optionCount))
  }

  return questions
}

/**
 * 檢查答案
 */
export function checkAnswer(question: PatternQuestion, selectedIndex: number): boolean {
  return selectedIndex === question.correctIndex
}

// ==================== 評分函數 ====================

/**
 * 計算分數
 */
export function calculateScore(
  correct: number,
  total: number,
  avgTime: number,
  timeLimit: number
): number {
  const accuracyScore = (correct / total) * 70
  const timeBonus = Math.max(0, (timeLimit - avgTime) / timeLimit) * 30

  return Math.round(accuracyScore + timeBonus)
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
 * 計算各類型準確率
 */
export function calculateTypeAccuracy(
  questions: PatternQuestion[],
  answers: boolean[]
): Record<PatternType, number> {
  const stats: Record<PatternType, { correct: number; total: number }> = {
    rotation: { correct: 0, total: 0 },
    sequence: { correct: 0, total: 0 },
    transform: { correct: 0, total: 0 },
    analogy: { correct: 0, total: 0 },
    progression: { correct: 0, total: 0 },
  }

  questions.forEach((q, i) => {
    stats[q.type].total++
    if (answers[i]) {
      stats[q.type].correct++
    }
  })

  const result: Record<PatternType, number> = {
    rotation: 0,
    sequence: 0,
    transform: 0,
    analogy: 0,
    progression: 0,
  }

  for (const type of Object.keys(stats) as PatternType[]) {
    const { correct, total } = stats[type]
    result[type] = total > 0 ? Math.round((correct / total) * 100) : 0
  }

  return result
}

/**
 * 彙整遊戲結果
 */
export function summarizeResult(
  questions: PatternQuestion[],
  answers: boolean[],
  times: number[],
  config: PatternReasoningConfig
): PatternReasoningResult {
  const correct = answers.filter(Boolean).length
  const total = questions.length
  const accuracy = Math.round((correct / total) * 100)
  const avgTime = times.length > 0
    ? times.reduce((a, b) => a + b, 0) / times.length
    : 0

  const score = calculateScore(correct, total, avgTime, config.timePerQuestion)
  const typeAccuracy = calculateTypeAccuracy(questions, answers)

  return {
    score,
    accuracy,
    correct,
    total,
    avgTime: Math.round(avgTime * 10) / 10,
    typeAccuracy,
  }
}

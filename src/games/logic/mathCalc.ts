/**
 * 數學計算遊戲邏輯
 * 包含題目生成、答案驗證、難度配置
 */

export type MathOperation = '+' | '-' | '×' | '÷'

export interface MathQuestion {
  id: number
  num1: number
  num2: number
  operation: MathOperation
  answer: number
  options: number[]
}

export interface MathCalcConfig {
  /** 時間限制（秒） */
  timeLimit: number
  /** 題目數量 */
  questionsCount: number
  /** 允許的運算符號 */
  operations: readonly MathOperation[]
  /** 最大數字 */
  maxNumber: number
  /** 基礎分數 */
  basePoints: number
  /** 時間獎勵係數（毫秒轉分數） */
  timeBonusFactor: number
}

// 難度配置
export const MATH_CALC_CONFIGS: Record<'easy' | 'medium' | 'hard', MathCalcConfig> = {
  easy: {
    timeLimit: 120,
    questionsCount: 10,
    operations: ['+', '-'],
    maxNumber: 20,
    basePoints: 10,
    timeBonusFactor: 500,
  },
  medium: {
    timeLimit: 120,
    questionsCount: 12,
    operations: ['+', '-', '×'],
    maxNumber: 50,
    basePoints: 15,
    timeBonusFactor: 400,
  },
  hard: {
    timeLimit: 120,
    questionsCount: 15,
    operations: ['+', '-', '×', '÷'],
    maxNumber: 100,
    basePoints: 20,
    timeBonusFactor: 300,
  },
}

/**
 * 產生單一數學題目
 */
export function generateQuestion(
  config: MathCalcConfig,
  questionId: number
): MathQuestion {
  const operationIndex = Math.floor(Math.random() * config.operations.length)
  const operation = config.operations[operationIndex] ?? '+'
  
  let num1 = 0
  let num2 = 0
  let answer = 0

  switch (operation) {
    case '+':
      num1 = randomInt(1, config.maxNumber)
      num2 = randomInt(1, config.maxNumber)
      answer = num1 + num2
      break
      
    case '-':
      num1 = randomInt(1, config.maxNumber)
      num2 = randomInt(1, num1) // 確保結果為正
      answer = num1 - num2
      break
      
    case '×':
      num1 = randomInt(1, 12) // 限制乘法範圍
      num2 = randomInt(1, 12)
      answer = num1 * num2
      break
      
    case '÷':
      num2 = randomInt(1, 12)
      answer = randomInt(1, 12)
      num1 = num2 * answer // 確保整除
      break
  }

  const options = generateOptions(answer)

  return {
    id: questionId,
    num1,
    num2,
    operation,
    answer,
    options,
  }
}

/**
 * 產生所有題目
 */
export function generateAllQuestions(config: MathCalcConfig): MathQuestion[] {
  const questions: MathQuestion[] = []
  
  for (let i = 0; i < config.questionsCount; i++) {
    questions.push(generateQuestion(config, i + 1))
  }
  
  return questions
}

/**
 * 產生選項（包含正確答案與干擾選項）
 */
export function generateOptions(correctAnswer: number): number[] {
  const options = new Set<number>([correctAnswer])
  
  while (options.size < 4) {
    // 產生接近正確答案的干擾選項
    const offset = randomInt(-5, 5)
    if (offset !== 0) {
      const wrong = correctAnswer + offset
      if (wrong > 0) {
        options.add(wrong)
      }
    }
    
    // 也加入一些隨機數
    if (options.size < 4) {
      const randomOption = randomInt(
        Math.max(1, correctAnswer - 10),
        correctAnswer + 10
      )
      if (randomOption > 0 && randomOption !== correctAnswer) {
        options.add(randomOption)
      }
    }
  }

  // 打亂順序
  return Array.from(options).sort(() => Math.random() - 0.5)
}

/**
 * 驗證答案
 */
export function validateAnswer(
  question: MathQuestion,
  userAnswer: number
): boolean {
  return userAnswer === question.answer
}

/**
 * 計算題目分數
 * @param isCorrect 是否正確
 * @param responseTimeMs 回應時間（毫秒）
 * @param config 難度配置
 * @param combo 當前連擊數
 */
export function calculateQuestionScore(
  isCorrect: boolean,
  responseTimeMs: number,
  config: MathCalcConfig,
  combo: number = 0
): number {
  if (!isCorrect) return 0
  
  // 基礎分數
  let score = config.basePoints
  
  // 時間獎勵（越快越多分）
  const maxTimeBonus = 10
  const expectedMs = Math.max(
    4000,
    Math.min(8000, Math.round((config.timeLimit * 1000) / Math.max(1, config.questionsCount)))
  )
  const timeBonus = Math.max(0, Math.floor((expectedMs - responseTimeMs) / config.timeBonusFactor))
  score += Math.min(timeBonus, maxTimeBonus)
  
  // 連擊獎勵
  if (combo >= 3) {
    score += Math.floor(combo * 0.5)
  }
  
  return score
}

/**
 * 計算評價等級
 */
export function calculateGrade(
  score: number,
  maxScore: number,
  accuracy: number
): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const scoreRatio = score / maxScore
  
  // 綜合評估（分數 60% + 正確率 40%）
  const composite = scoreRatio * 0.6 + accuracy * 0.4
  
  if (composite >= 0.95) return 'S'
  if (composite >= 0.85) return 'A'
  if (composite >= 0.70) return 'B'
  if (composite >= 0.55) return 'C'
  if (composite >= 0.40) return 'D'
  return 'F'
}

/**
 * 計算最大可能分數
 */
export function calculateMaxScore(config: MathCalcConfig): number {
  // 假設每題都在最快時間內答對，且有最高連擊
  const maxTimeBonus = 10
  const maxComboBonus = Math.floor(config.questionsCount * 0.5)
  return config.questionsCount * (config.basePoints + maxTimeBonus) + maxComboBonus
}

/**
 * 輔助函數：產生範圍內隨機整數
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 遊戲結果類型
 */
export interface MathCalcResult {
  score: number
  maxScore: number
  correctCount: number
  wrongCount: number
  totalCount: number
  accuracy: number
  duration: number
  avgResponseTime: number
  maxCombo: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  responseTimes: number[]
}

/**
 * 彙總遊戲結果
 */
export function summarizeResult(
  score: number,
  correctCount: number,
  wrongCount: number,
  duration: number,
  responseTimes: number[],
  maxCombo: number,
  config: MathCalcConfig
): MathCalcResult {
  const totalCount = correctCount + wrongCount
  const accuracy = totalCount > 0 ? correctCount / totalCount : 0
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0
  const maxScore = calculateMaxScore(config)
  const grade = calculateGrade(score, maxScore, accuracy)
  
  return {
    score,
    maxScore,
    correctCount,
    wrongCount,
    totalCount,
    accuracy,
    duration,
    avgResponseTime,
    maxCombo,
    grade,
    responseTimes,
  }
}

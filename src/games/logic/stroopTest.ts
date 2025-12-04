/**
 * Stroop 測試遊戲邏輯
 * 顏色-文字干擾測試，訓練注意力與抑制控制
 */

export type QuestionType = 'ink' | 'meaning'
export type GameMode = 'ink' | 'meaning' | 'mixed'

export interface ColorOption {
  name: string
  label: string
  value: string
}

export interface StroopQuestion {
  id: number
  word: string           // 文字內容（如「紅色」）
  wordColorName: string  // 文字代表的顏色名稱（如 'red'）
  inkColor: string       // 墨水顏色值（如 '#3b82f6'）
  inkColorName: string   // 墨水顏色名稱（如 'blue'）
  borderColor: string    // 外框顏色（干擾用）
  questionType: QuestionType // 詢問類型
  correctAnswer: string  // 正確答案
  isCongruent: boolean   // 文字與顏色是否一致
}

export interface StroopConfig {
  /** 總回合數 */
  rounds: number
  /** 每回合時間（秒） */
  timePerRound: number
  /** 一致題目機率 */
  congruentChance: number
  /** 遊戲模式 */
  mode: GameMode
}

// 難度配置
export const STROOP_CONFIGS: Record<'easy' | 'medium' | 'hard', StroopConfig> = {
  // easy: 固定詢問「墨水顏色」
  easy: {
    rounds: 10,
    timePerRound: 8,
    congruentChance: 0.5,
    mode: 'ink',
  },
  // medium: 固定詢問「文字意思」（反直覺挑戰）
  medium: {
    rounds: 15,
    timePerRound: 6,
    congruentChance: 0.3,
    mode: 'meaning',
  },
  // hard: 隨機切換詢問類型（mixed 模式）
  hard: {
    rounds: 20,
    timePerRound: 4,
    congruentChance: 0.2,
    mode: 'mixed',
  },
}

// 顏色選項
export const COLORS: ColorOption[] = [
  { name: 'red', label: '紅色', value: '#ef4444' },
  { name: 'blue', label: '藍色', value: '#3b82f6' },
  { name: 'green', label: '綠色', value: '#22c55e' },
  { name: 'yellow', label: '黃色', value: '#eab308' },
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
 * 生成單一題目
 */
export function generateQuestion(
  config: StroopConfig,
  questionId: number
): StroopQuestion {
  const shuffledColors = shuffle(COLORS)
  
  // 決定本題的詢問類型
  let questionType: QuestionType
  if (config.mode === 'mixed') {
    questionType = Math.random() < 0.5 ? 'ink' : 'meaning'
  } else {
    questionType = config.mode === 'meaning' ? 'meaning' : 'ink'
  }
  
  // 決定是否一致
  const isCongruent = Math.random() < config.congruentChance
  
  const wordColor = shuffledColors[0]!
  const inkColor = isCongruent ? wordColor : shuffledColors[1]!
  
  // 外框顏色（選擇不同的顏色增加干擾）
  const borderOptions = shuffledColors.filter(
    c => c !== wordColor && c !== inkColor
  )
  const borderColorOption = borderOptions[0] || shuffledColors[2]!
  
  // 根據詢問類型決定正確答案
  const correctAnswer = questionType === 'ink' 
    ? inkColor.name 
    : wordColor.name
  
  return {
    id: questionId,
    word: wordColor.label,
    wordColorName: wordColor.name,
    inkColor: inkColor.value,
    inkColorName: inkColor.name,
    borderColor: borderColorOption.value,
    questionType,
    correctAnswer,
    isCongruent,
  }
}

/**
 * 生成所有題目
 */
export function generateAllQuestions(config: StroopConfig): StroopQuestion[] {
  const questions: StroopQuestion[] = []
  
  for (let i = 0; i < config.rounds; i++) {
    questions.push(generateQuestion(config, i + 1))
  }
  
  return questions
}

/**
 * 生成選項（打亂順序）
 */
export function generateOptions(): ColorOption[] {
  return shuffle([...COLORS])
}

/**
 * 驗證答案
 */
export function validateAnswer(
  question: StroopQuestion,
  userAnswer: string
): boolean {
  return userAnswer === question.correctAnswer
}

/**
 * 取得正確答案標籤
 */
export function getCorrectAnswerLabel(question: StroopQuestion): string {
  const color = COLORS.find(c => c.name === question.correctAnswer)
  return color?.label || ''
}

/**
 * 取得遊戲模式說明
 */
export function getModeDescription(mode: GameMode): string {
  switch (mode) {
    case 'ink':
      return '快速選出文字的「顏色」，而非文字本身的意思！'
    case 'meaning':
      return '快速選出文字的「意思」，忽略它的顯示顏色！'
    case 'mixed':
      return '根據提示選出文字的「顏色」或「意思」，注意切換！'
  }
}

/**
 * 取得難度說明
 */
export function getDifficultyExplanation(mode: GameMode): string {
  switch (mode) {
    case 'ink':
      return '簡單模式 - 只需判斷文字的顏色（墨水顏色）'
    case 'meaning':
      return '中等模式 - 只需判斷文字代表的意思'
    case 'mixed':
      return '困難模式 - 隨機切換判斷顏色或意思，需快速反應！'
  }
}

/**
 * 取得題目提示
 */
export function getQuestionPrompt(questionType: QuestionType): {
  icon: string
  text: string
} {
  return questionType === 'ink'
    ? { icon: '🎨', text: '請選擇文字的【顏色】' }
    : { icon: '📝', text: '請選擇文字的【意思】' }
}

/**
 * 計算分數
 */
export function calculateScore(
  correctCount: number,
  totalCount: number,
  avgReactionTime: number
): number {
  const accuracy = totalCount > 0 ? correctCount / totalCount : 0
  
  // 準確度佔 75%
  const accuracyScore = accuracy * 75
  
  // 速度獎勵佔 25%（2秒內作答給予獎勵）
  const speedBonus = avgReactionTime > 0 && avgReactionTime < 2000
    ? Math.min(25, (2000 - avgReactionTime) / 80)
    : 0
  
  return Math.round(Math.min(100, accuracyScore + speedBonus))
}

/**
 * 計算評價等級
 */
export function calculateGrade(
  score: number,
  accuracy: number,
  avgReactionTime: number
): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  // 綜合評估（分數 60% + 準確率 25% + 速度 15%）
  const speedFactor = avgReactionTime > 0 
    ? Math.min(1, 2000 / avgReactionTime) 
    : 0.5
  
  const composite = (score / 100) * 0.6 + accuracy * 0.25 + speedFactor * 0.15
  
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
export interface StroopResult {
  score: number
  correctCount: number
  totalCount: number
  accuracy: number
  avgReactionTime: number
  duration: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  congruentCorrect: number
  incongruentCorrect: number
}

/**
 * 彙總遊戲結果
 */
export function summarizeResult(
  correctCount: number,
  totalCount: number,
  reactionTimes: number[],
  config: StroopConfig,
  congruentCorrect: number = 0,
  incongruentCorrect: number = 0
): StroopResult {
  const accuracy = totalCount > 0 ? correctCount / totalCount : 0
  const avgReactionTime = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0
  
  const score = calculateScore(correctCount, totalCount, avgReactionTime)
  const grade = calculateGrade(score, accuracy, avgReactionTime)
  const duration = totalCount * config.timePerRound
  
  return {
    score,
    correctCount,
    totalCount,
    accuracy,
    avgReactionTime,
    duration,
    grade,
    congruentCorrect,
    incongruentCorrect,
  }
}

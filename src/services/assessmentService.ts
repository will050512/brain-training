/**
 * 能力評估服務
 * 提供 3 分鐘快速能力評估，決定使用者起始難度
 */

import type { Difficulty } from '@/types/game'

// 評估題目類型
export type AssessmentQuestionType = 'reaction' | 'memory' | 'logic'

// 單一評估題目
export interface AssessmentQuestion {
  id: string
  type: AssessmentQuestionType
  question: string
  options?: string[]
  correctAnswer: string | number
  timeLimit: number // 秒
  data?: Record<string, unknown>
}

// 評估回答結果
export interface AssessmentAnswer {
  questionId: string
  userAnswer: string | number | null
  isCorrect: boolean
  reactionTime: number // 毫秒
}

// 評估結果
export interface AssessmentResult {
  totalQuestions: number
  correctCount: number
  accuracy: number
  averageReactionTime: number
  scores: {
    reaction: number
    memory: number
    logic: number
  }
  suggestedDifficulty: Difficulty
  completedAt: string
}

// 反應力測試題目生成
function generateReactionQuestions(count: number): AssessmentQuestion[] {
  const colors = ['紅色', '藍色', '綠色', '黃色']
  const colorCodes = ['#ef4444', '#3b82f6', '#22c55e', '#eab308']
  
  return Array.from({ length: count }, (_, i) => {
    const correctIndex = Math.floor(Math.random() * colors.length)
    return {
      id: `reaction-${i}`,
      type: 'reaction' as const,
      question: '請點擊顯示的顏色名稱',
      options: colors,
      correctAnswer: colors[correctIndex]!,
      timeLimit: 5,
      data: {
        displayColor: colorCodes[correctIndex],
        displayText: colors[correctIndex],
      }
    }
  })
}

// 記憶力測試題目生成
function generateMemoryQuestions(count: number): AssessmentQuestion[] {
  const questions: AssessmentQuestion[] = []
  
  for (let i = 0; i < count; i++) {
    // 生成隨機數字序列（3-5位數）
    const length = 3 + Math.floor(i / 2)
    const sequence = Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
    
    questions.push({
      id: `memory-${i}`,
      type: 'memory',
      question: `請記住以下數字，然後輸入`,
      correctAnswer: sequence,
      timeLimit: 10,
      data: {
        sequence,
        displayTime: 2000 + length * 500, // 顯示時間隨長度增加
      }
    })
  }
  
  return questions
}

// 邏輯力測試題目生成
function generateLogicQuestions(count: number): AssessmentQuestion[] {
  const questions: AssessmentQuestion[] = []
  
  for (let i = 0; i < count; i++) {
    // 簡單數學題
    const difficulty = Math.floor(i / 2) // 0, 0, 1, 1, 2
    let a: number, b: number, operator: string, answer: number
    
    if (difficulty === 0) {
      // 簡單加法
      a = Math.floor(Math.random() * 10) + 1
      b = Math.floor(Math.random() * 10) + 1
      operator = '+'
      answer = a + b
    } else if (difficulty === 1) {
      // 減法
      a = Math.floor(Math.random() * 15) + 5
      b = Math.floor(Math.random() * a)
      operator = '-'
      answer = a - b
    } else {
      // 乘法
      a = Math.floor(Math.random() * 9) + 2
      b = Math.floor(Math.random() * 9) + 2
      operator = '×'
      answer = a * b
    }
    
    // 生成選項（包含正確答案和干擾項）
    const options = [answer]
    while (options.length < 4) {
      const wrong = answer + Math.floor(Math.random() * 10) - 5
      if (wrong !== answer && wrong > 0 && !options.includes(wrong)) {
        options.push(wrong)
      }
    }
    // 打亂選項順序
    options.sort(() => Math.random() - 0.5)
    
    questions.push({
      id: `logic-${i}`,
      type: 'logic',
      question: `${a} ${operator} ${b} = ?`,
      options: options.map(String),
      correctAnswer: String(answer),
      timeLimit: 10,
      data: { a, b, operator, answer }
    })
  }
  
  return questions
}

// 生成完整評估題目集
export function generateAssessmentQuestions(): AssessmentQuestion[] {
  const reactionQuestions = generateReactionQuestions(5)  // 5題反應
  const memoryQuestions = generateMemoryQuestions(3)      // 3題記憶
  const logicQuestions = generateLogicQuestions(4)        // 4題邏輯
  
  // 混合題目順序
  const allQuestions = [
    ...reactionQuestions.slice(0, 2),
    memoryQuestions[0],
    ...logicQuestions.slice(0, 2),
    ...reactionQuestions.slice(2, 4),
    memoryQuestions[1],
    ...logicQuestions.slice(2),
    reactionQuestions[4],
    memoryQuestions[2],
  ].filter(Boolean) as AssessmentQuestion[]
  
  return allQuestions
}

// 計算評估結果
export function calculateAssessmentResult(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswer[]
): AssessmentResult {
  const answerMap = new Map(answers.map(a => [a.questionId, a]))
  
  // 分類統計
  const stats = {
    reaction: { correct: 0, total: 0, totalTime: 0 },
    memory: { correct: 0, total: 0, totalTime: 0 },
    logic: { correct: 0, total: 0, totalTime: 0 },
  }
  
  questions.forEach(q => {
    const answer = answerMap.get(q.id)
    stats[q.type].total++
    if (answer) {
      stats[q.type].totalTime += answer.reactionTime
      if (answer.isCorrect) {
        stats[q.type].correct++
      }
    }
  })
  
  // 計算各維度分數 (0-100)
  const calculateScore = (correct: number, total: number, avgTime: number): number => {
    if (total === 0) return 50
    const accuracyScore = (correct / total) * 70 // 正確率佔 70%
    const timeScore = Math.max(0, 30 - (avgTime / 1000) * 3) // 反應時間佔 30%
    return Math.round(accuracyScore + timeScore)
  }
  
  const scores = {
    reaction: calculateScore(
      stats.reaction.correct,
      stats.reaction.total,
      stats.reaction.total > 0 ? stats.reaction.totalTime / stats.reaction.total : 5000
    ),
    memory: calculateScore(
      stats.memory.correct,
      stats.memory.total,
      stats.memory.total > 0 ? stats.memory.totalTime / stats.memory.total : 8000
    ),
    logic: calculateScore(
      stats.logic.correct,
      stats.logic.total,
      stats.logic.total > 0 ? stats.logic.totalTime / stats.logic.total : 8000
    ),
  }
  
  // 計算總體統計
  const totalCorrect = answers.filter(a => a.isCorrect).length
  const totalTime = answers.reduce((sum, a) => sum + a.reactionTime, 0)
  const avgScore = (scores.reaction + scores.memory + scores.logic) / 3
  
  // 決定建議難度
  let suggestedDifficulty: Difficulty
  if (avgScore >= 70) {
    suggestedDifficulty = 'medium'
  } else if (avgScore >= 50) {
    suggestedDifficulty = 'easy'
  } else {
    suggestedDifficulty = 'easy'
  }
  
  // 如果正確率很高且反應時間很快，建議 hard
  if (avgScore >= 85 && totalCorrect >= questions.length * 0.9) {
    suggestedDifficulty = 'hard'
  }
  
  return {
    totalQuestions: questions.length,
    correctCount: totalCorrect,
    accuracy: totalCorrect / questions.length,
    averageReactionTime: answers.length > 0 ? totalTime / answers.length : 0,
    scores,
    suggestedDifficulty,
    completedAt: new Date().toISOString(),
  }
}

// 取得難度說明
export function getDifficultyDescription(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy':
      return '簡單模式適合您目前的狀態，讓您可以輕鬆上手，逐步提升。'
    case 'medium':
      return '您的能力表現良好！中等難度將為您帶來適度的挑戰。'
    case 'hard':
      return '您的表現非常出色！困難模式將充分發揮您的潛力。'
  }
}

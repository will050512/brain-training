/**
 * 時鐘繪圖 AI 分析服務
 * 使用圖像分析技術自動評估時鐘繪圖的正確性
 */

import type { ClockDrawingSelfAssessment } from './miniCogService'

// 分析結果介面
export interface ClockAnalysisResult {
  // 基本評估
  hasCircle: boolean
  circleQuality: number // 0-100 圓形品質分數
  
  // 數字分析
  numbersDetected: number[] // 偵測到的數字
  numbersPositionScore: number // 0-100 數字位置正確性
  hasAllNumbers: boolean // 是否有 1-12 全部數字
  
  // 指針分析
  hasHourHand: boolean
  hasMinuteHand: boolean
  hourHandAngle: number | null // 時針角度
  minuteHandAngle: number | null // 分針角度
  handsPointToCorrectTime: boolean
  
  // 整體評估
  overallScore: number // 0-2 對應 Mini-Cog 評分
  confidence: number // 0-100 分析信心度
  selfAssessment: ClockDrawingSelfAssessment
  
  // 詳細分析
  analysisDetails: string[]
}

// 目標時間解析
interface TargetTime {
  hour: number
  minute: number
  hourAngle: number // 時針應該指向的角度 (0-360, 12點為0)
  minuteAngle: number // 分針應該指向的角度
}

/**
 * 解析目標時間字串
 */
function parseTargetTime(timeStr: string): TargetTime {
  const parts = timeStr.split(':')
  const hourStr = parts[0] ?? '11'
  const minuteStr = parts[1] ?? '10'
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)
  
  // 計算角度 (12點方向為0度, 順時針)
  // 時針: 每小時30度 + 每分鐘0.5度
  const hourAngle = ((hour % 12) * 30 + minute * 0.5) % 360
  // 分針: 每分鐘6度
  const minuteAngle = (minute * 6) % 360
  
  return { hour, minute, hourAngle, minuteAngle }
}

/**
 * 分析 Canvas 圖像數據
 */
export async function analyzeClockDrawing(
  imageData: string,
  targetTime: string = '11:10'
): Promise<ClockAnalysisResult> {
  const target = parseTargetTime(targetTime)
  const analysisDetails: string[] = []
  
  // 載入圖像進行分析
  const img = await loadImage(imageData)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = img.width
  canvas.height = img.height
  ctx.drawImage(img, 0, 0)
  
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  
  // 1. 分析圓形
  const circleAnalysis = analyzeCircle(pixels, canvas.width, canvas.height)
  analysisDetails.push(`圓形品質: ${circleAnalysis.quality}%`)
  
  // 2. 分析數字 (使用區域分析)
  const numbersAnalysis = analyzeNumbers(pixels, canvas.width, canvas.height)
  analysisDetails.push(`偵測到 ${numbersAnalysis.detected.length} 個數字區域`)
  
  // 3. 分析指針
  const handsAnalysis = analyzeHands(pixels, canvas.width, canvas.height, target)
  if (handsAnalysis.hourAngle !== null) {
    analysisDetails.push(`時針角度: ${handsAnalysis.hourAngle.toFixed(0)}° (目標: ${target.hourAngle.toFixed(0)}°)`)
  }
  if (handsAnalysis.minuteAngle !== null) {
    analysisDetails.push(`分針角度: ${handsAnalysis.minuteAngle.toFixed(0)}° (目標: ${target.minuteAngle.toFixed(0)}°)`)
  }
  
  // 4. 計算整體分數
  const selfAssessment: ClockDrawingSelfAssessment = {
    hasCompleteCircle: circleAnalysis.hasCircle && circleAnalysis.quality >= 50,
    hasCorrectNumbers: numbersAnalysis.positionScore >= 50 && numbersAnalysis.detected.length >= 8,
    hasCorrectHands: handsAnalysis.handsPointToCorrectTime
  }
  
  // Mini-Cog 評分: 0, 1, 或 2
  let overallScore = 0
  if (selfAssessment.hasCompleteCircle && selfAssessment.hasCorrectNumbers && selfAssessment.hasCorrectHands) {
    overallScore = 2 // 全部正確
  } else if (
    (selfAssessment.hasCompleteCircle && selfAssessment.hasCorrectNumbers) ||
    (selfAssessment.hasCompleteCircle && selfAssessment.hasCorrectHands) ||
    (selfAssessment.hasCorrectNumbers && selfAssessment.hasCorrectHands)
  ) {
    overallScore = 1 // 部分正確
  }
  
  // 計算信心度
  const confidence = calculateConfidence(circleAnalysis, numbersAnalysis, handsAnalysis)
  analysisDetails.push(`分析信心度: ${confidence}%`)
  
  return {
    hasCircle: circleAnalysis.hasCircle,
    circleQuality: circleAnalysis.quality,
    numbersDetected: numbersAnalysis.detected,
    numbersPositionScore: numbersAnalysis.positionScore,
    hasAllNumbers: numbersAnalysis.detected.length >= 12,
    hasHourHand: handsAnalysis.hasHourHand,
    hasMinuteHand: handsAnalysis.hasMinuteHand,
    hourHandAngle: handsAnalysis.hourAngle,
    minuteHandAngle: handsAnalysis.minuteAngle,
    handsPointToCorrectTime: handsAnalysis.handsPointToCorrectTime,
    overallScore,
    confidence,
    selfAssessment,
    analysisDetails
  }
}

/**
 * 載入圖像
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * 分析圓形
 */
function analyzeCircle(
  pixels: ImageData,
  width: number,
  height: number
): { hasCircle: boolean; quality: number; center: { x: number; y: number }; radius: number } {
  // 找出所有黑色/深色像素
  const darkPixels: { x: number; y: number }[] = []
  const threshold = 100
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = pixels.data[i] ?? 255
      const g = pixels.data[i + 1] ?? 255
      const b = pixels.data[i + 2] ?? 255
      const brightness = (r + g + b) / 3
      
      if (brightness < threshold) {
        darkPixels.push({ x, y })
      }
    }
  }
  
  if (darkPixels.length < 50) {
    return { hasCircle: false, quality: 0, center: { x: width / 2, y: height / 2 }, radius: 0 }
  }
  
  // 計算邊界框
  const minX = Math.min(...darkPixels.map(p => p.x))
  const maxX = Math.max(...darkPixels.map(p => p.x))
  const minY = Math.min(...darkPixels.map(p => p.y))
  const maxY = Math.max(...darkPixels.map(p => p.y))
  
  // 估計圓心和半徑
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const estimatedRadius = Math.max(maxX - minX, maxY - minY) / 2
  
  // 檢查邊緣像素是否形成圓形
  const edgePixels = darkPixels.filter(p => {
    const dist = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
    return Math.abs(dist - estimatedRadius) < estimatedRadius * 0.3
  })
  
  // 計算圓形品質
  const expectedCircumference = 2 * Math.PI * estimatedRadius
  const coverage = edgePixels.length / expectedCircumference
  const quality = Math.min(100, Math.round(coverage * 200))
  
  // 檢查長寬比是否接近 1 (圓形) - 放寬標準以適應手繪
  const aspectRatio = (maxX - minX) / (maxY - minY)
  const isCircular = aspectRatio > 0.5 && aspectRatio < 2.0
  
  return {
    hasCircle: quality > 30 && isCircular,
    quality: isCircular ? quality : quality * 0.5,
    center: { x: centerX, y: centerY },
    radius: estimatedRadius
  }
}

/**
 * 分析數字區域
 */
function analyzeNumbers(
  pixels: ImageData,
  width: number,
  height: number
): { detected: number[]; positionScore: number } {
  // 將圖像分成 12 個區域，對應時鐘的 12 個數字位置
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.35
  
  const expectedPositions = []
  for (let i = 1; i <= 12; i++) {
    // 計算每個數字應該在的角度位置 (12 在上方)
    const angle = ((i - 3) * 30) * Math.PI / 180 // 轉換為弧度，3點為0度
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    expectedPositions.push({ number: i, x, y })
  }
  
  // 分析每個區域是否有內容 (簡化版本)
  const detected: number[] = []
  const regionSize = 30
  
  for (const pos of expectedPositions) {
    let darkCount = 0
    const startX = Math.max(0, Math.floor(pos.x - regionSize / 2))
    const endX = Math.min(width, Math.floor(pos.x + regionSize / 2))
    const startY = Math.max(0, Math.floor(pos.y - regionSize / 2))
    const endY = Math.min(height, Math.floor(pos.y + regionSize / 2))
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * width + x) * 4
        const brightness = ((pixels.data[i] ?? 255) + (pixels.data[i + 1] ?? 255) + (pixels.data[i + 2] ?? 255)) / 3
        if (brightness < 100) darkCount++
      }
    }
    
    // 如果區域有足夠的深色像素，認為有數字 (放寬門檻適應手繪)
    if (darkCount > 8) {
      detected.push(pos.number)
    }
  }
  
  // 位置分數基於偵測到的數字數量和關鍵位置
  const keyNumbers = [12, 3, 6, 9]
  const keyPresent = keyNumbers.filter(n => detected.includes(n)).length
  const positionScore = Math.round(
    (detected.length / 12 * 60) + (keyPresent / 4 * 40)
  )
  
  return { detected, positionScore }
}

/**
 * 分析指針
 */
function analyzeHands(
  pixels: ImageData,
  width: number,
  height: number,
  target: TargetTime
): {
  hasHourHand: boolean
  hasMinuteHand: boolean
  hourAngle: number | null
  minuteAngle: number | null
  handsPointToCorrectTime: boolean
} {
  const centerX = width / 2
  const centerY = height / 2
  
  // 使用射線掃描偵測指針
  const angles: { angle: number; strength: number }[] = []
  const scanRadius = Math.min(width, height) * 0.4
  
  // 掃描 360 度
  for (let angle = 0; angle < 360; angle += 2) {
    const radians = angle * Math.PI / 180
    let strength = 0
    
    // 沿著射線掃描
    for (let r = 20; r < scanRadius; r += 2) {
      const x = Math.floor(centerX + r * Math.cos(radians))
      const y = Math.floor(centerY + r * Math.sin(radians))
      
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const i = (y * width + x) * 4
        const brightness = ((pixels.data[i] ?? 255) + (pixels.data[i + 1] ?? 255) + (pixels.data[i + 2] ?? 255)) / 3
        if (brightness < 100) strength++
      }
    }
    
    angles.push({ angle, strength })
  }
  
  // 找出兩個最強的方向作為指針
  const sortedAngles = [...angles].sort((a, b) => b.strength - a.strength)
  const hands: number[] = []
  
  for (const entry of sortedAngles) {
    if (entry.strength < 10) continue
    
    // 確保兩個指針角度不太接近
    const isFarEnough = hands.every(h => Math.abs(h - entry.angle) > 30 && Math.abs(h - entry.angle) < 330)
    if (isFarEnough || hands.length === 0) {
      hands.push(entry.angle)
      if (hands.length >= 2) break
    }
  }
  
  // 判斷哪個是時針哪個是分針
  let hourAngle: number | null = null
  let minuteAngle: number | null = null
  
  if (hands.length >= 2 && hands[0] !== undefined && hands[1] !== undefined) {
    // 轉換角度 (0度為3點方向，需要轉換為12點方向為0)
    const hand0 = (hands[0] + 90) % 360
    const hand1 = (hands[1] + 90) % 360
    
    // 根據與目標角度的接近程度分配
    const hand1ToHour = angleDiff(hand0, target.hourAngle)
    const hand1ToMinute = angleDiff(hand0, target.minuteAngle)
    const hand2ToHour = angleDiff(hand1, target.hourAngle)
    const hand2ToMinute = angleDiff(hand1, target.minuteAngle)
    
    if (hand1ToHour + hand2ToMinute < hand1ToMinute + hand2ToHour) {
      hourAngle = hand0
      minuteAngle = hand1
    } else {
      hourAngle = hand1
      minuteAngle = hand0
    }
  } else if (hands.length === 1 && hands[0] !== undefined) {
    // 只有一個指針
    const converted = (hands[0] + 90) % 360
    hourAngle = converted
  }
  
  // 檢查指針是否指向正確時間 (允許 45 度誤差，適應手繪不精確)
  const hourCorrect = hourAngle !== null && angleDiff(hourAngle, target.hourAngle) < 45
  const minuteCorrect = minuteAngle !== null && angleDiff(minuteAngle, target.minuteAngle) < 45
  const handsPointToCorrectTime = hourCorrect && minuteCorrect
  
  return {
    hasHourHand: hourAngle !== null,
    hasMinuteHand: minuteAngle !== null,
    hourAngle,
    minuteAngle,
    handsPointToCorrectTime
  }
}

/**
 * 計算兩個角度之間的最小差異
 */
function angleDiff(a: number, b: number): number {
  const diff = Math.abs(a - b)
  return Math.min(diff, 360 - diff)
}

/**
 * 計算分析信心度
 */
function calculateConfidence(
  circle: { hasCircle: boolean; quality: number },
  numbers: { detected: number[]; positionScore: number },
  hands: { hasHourHand: boolean; hasMinuteHand: boolean }
): number {
  let confidence = 0
  
  // 圓形偵測信心度 (30%)
  if (circle.hasCircle) {
    confidence += Math.min(30, circle.quality * 0.3)
  }
  
  // 數字偵測信心度 (35%)
  confidence += Math.min(35, numbers.positionScore * 0.35)
  
  // 指針偵測信心度 (35%)
  if (hands.hasHourHand) confidence += 17
  if (hands.hasMinuteHand) confidence += 18
  
  return Math.round(confidence)
}

/**
 * 快速分析 (低精度但快速)
 */
export function quickAnalyzeClockDrawing(
  selfAssessment: ClockDrawingSelfAssessment
): number {
  let score = 0
  if (selfAssessment.hasCompleteCircle) score++
  if (selfAssessment.hasCorrectNumbers) score++
  if (selfAssessment.hasCorrectHands) score++
  
  // 轉換為 0-2 分
  if (score >= 3) return 2
  if (score >= 2) return 1
  return 0
}

export default {
  analyzeClockDrawing,
  quickAnalyzeClockDrawing,
  parseTargetTime
}

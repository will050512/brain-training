/**
 * PDF 報告生成服務
 * 參考 MMSE/MoCA 台灣醫療系統報告格式
 * 支援繁體中文 (Noto Sans TC)、雙語法律聲明
 */

import jsPDF from 'jspdf'
import type { TrainingDirectionInsight } from '@/services/correlationAnalysisService'

// 引入 LOGO Base64（由 generate-icons 腳本產生）
let LOGO_BASE64: string | null = null
let LOGO_WIDTH = 40
let LOGO_HEIGHT = 12

// 動態載入 LOGO
async function loadLogo(): Promise<void> {
  try {
    const logoModule = await import('@/assets/logo-base64')
    LOGO_BASE64 = logoModule.LOGO_BASE64
    LOGO_WIDTH = logoModule.LOGO_WIDTH / 3  // 提高清晰度與可讀性
    LOGO_HEIGHT = logoModule.LOGO_HEIGHT / 3
  } catch {
    console.warn('無法載入 LOGO，將使用文字標題')
  }
}

// ===== 類型定義 =====

export interface ReportUserInfo {
  name: string
  age: number
  educationYears: number
  reportDate: string
}

export interface MiniCogReportData {
  totalScore: number
  wordRecallScore: number
  clockDrawingScore: number
  clockSelfAssessment: number
  atRisk: boolean
  duration: number
  completedAt: string
  clockImageData?: string
  wordsUsed?: string[]
}

export interface CognitiveScoreData {
  memory: number
  attention: number
  processing: number
  executive: number
  language: number
}

export interface TrendDataPoint {
  date: string
  score: number
  gameType?: string
}

export interface BehaviorSummary {
  thinkingTimePattern: string
  decisionStability: string
  fatigueLevel: string
  attentionQuality: string
}

export interface PdfReportOptions {
  includeClockDrawing?: boolean
  includeTrends?: boolean
  includeBehavior?: boolean
  includeRecommendations?: boolean
  includeNutrition?: boolean
  language?: 'zh-TW' | 'en' | 'bilingual'
  radarChartImage?: string | null
  trendChartImage?: string | null
  quickDirectionInsight?: TrainingDirectionInsight | null
}

/** 營養建議資料（用於 PDF 報告） */
export interface NutritionReportData {
  recommendations: Array<{
    name: string
    reason: string
    priority: 'high' | 'medium' | 'low'
    dosage: string
    isPartnerProduct?: boolean
    partnerName?: string
  }>
  cognitiveAdvice: string[]
  generalAdvice: string[]
}

// ===== 常數定義 ===== (調整顏色/字級並加入字型常數)
const FONT_NAME = 'NotoSansTC'
const FONT_FILENAME = 'NotoSansTC-Regular.ttf' // 請將 NotoSansTC-Regular.ttf 放到 public/fonts/ (見 README)

const COLORS = {
  primary: '#4f46e5',
  secondary: '#334155',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  text: '#0f172a',
  lightText: '#64748b',
  border: '#cbd5e1',
  background: '#f8fafc',
  headerBg: '#e0e7ff',
}

const RISK_COLORS: Record<'high' | 'low', string> = {
  high: COLORS.danger,
  low: COLORS.success,
}

const FONT_SIZES = {
  title: 20,
  subtitle: 14,
  heading: 12,
  body: 10,
  small: 9,
  tiny: 8,
}

const LINE_HEIGHTS = {
  heading: 5,
  body: 4.5,
  small: 4,
  tiny: 3.5,
}

// ===== 字體管理（替換原有快取方案，改為直接載入 public/fonts） =====

let fontLoaded = false
let fontBase64: string | null = null

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    const v = bytes[i] ?? 0
    binary += String.fromCharCode(v)
  }
  return window.btoa(binary)
}

/**
 * 載入中文字型（優先本地 public/fonts，其次可再考慮 CDN）
 * 會檢查 response header 與檔案大小避免回傳 404 HTML 被當成字型
 */
async function loadChineseFont(): Promise<string | null> {
  if (fontLoaded && fontBase64) return fontBase64

  // 使用 import.meta.env.BASE_URL 構建正確的 URL，支援子目錄部署
  const baseUrl = (import.meta && (import.meta as any).env && (import.meta as any).env.BASE_URL) ? String((import.meta as any).env.BASE_URL) : '/'
  const fontUrl = new URL('fonts/' + FONT_FILENAME, window.location.origin + baseUrl).href

  console.log(`[PDF] 準備載入字型，目標網址: ${fontUrl}`)

  try {
    const res = await fetch(fontUrl)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`)
    }

    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      throw new Error('伺服器回傳的是 HTML，可能為 404 頁面，請檢查 public/fonts 路徑與檔名')
    }

    const ab = await res.arrayBuffer()
    if (ab.byteLength < 1000) {
      throw new Error(`字型檔太小 (${ab.byteLength} bytes)，可能已損毀`) 
    }

    fontBase64 = arrayBufferToBase64(ab)
    fontLoaded = true
    console.log(`[PDF] 成功載入字型 (${fontUrl}), size=${ab.byteLength}`)
    return fontBase64
  } catch (e) {
    console.error('[PDF] 本地字型載入失敗:', e)
    try { alert(`無法載入字型檔！\n請確認 public/fonts/${FONT_FILENAME} 是否存在。\n嘗試的 URL: ${fontUrl}`) } catch {}
    return null
  }
}

/**
 * 初始化 PDF 並註冊中文字型；若失敗會 alert 提示避免產生亂碼 PDF
 */
async function initPdfWithFont(): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const base64 = await loadChineseFont()
  if (base64) {
    doc.addFileToVFS(FONT_FILENAME, base64)
    doc.addFont(FONT_FILENAME, FONT_NAME, 'normal')
    doc.setFont(FONT_NAME)
  } else {
    const msg = '❌ 無法載入中文字型 (public/fonts/NotoSansTC-Regular.ttf)。PDF 會出現中文亂碼，請確認字型已放到 public/fonts 並重新啟動應用。'
    console.error(msg)
    // 直接提示開發者（開發環境或使用者要能注意到）
    try { alert(msg) } catch { /* 無視無法 alert 的環境 */ }
    doc.setFont('helvetica') // 回退
  }

  return doc
}

// ===== 報告生成 =====

/**
 * 生成認知評估報告 PDF
 */
export async function generateCognitiveReport(
  userInfo: ReportUserInfo,
  miniCogData: MiniCogReportData | null,
  cognitiveScores: CognitiveScoreData | null,
  trends: TrendDataPoint[] | null,
  behaviorSummary: BehaviorSummary | null,
  options: PdfReportOptions = {},
  nutritionData?: NutritionReportData | null
): Promise<Blob> {
  // 載入 LOGO
  await loadLogo()
  
  const doc = await initPdfWithFont()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let currentY = margin

  // ===== 報告標題頁 =====
  currentY = drawReportHeader(doc, currentY, pageWidth, margin)
  currentY = drawPatientInfo(doc, userInfo, currentY, margin, pageWidth)
  
  // ===== Mini-Cog 評估結果 =====
  if (miniCogData) {
    currentY = drawMiniCogSection(doc, miniCogData, currentY, margin, pageWidth, options)
  }

  // ===== 認知功能分數 =====
  if (cognitiveScores) {
    // 檢查是否需要換頁
    currentY = ensurePageSpace(doc, currentY, 80, margin, pageHeight)
    currentY = drawCognitiveScoresSection(doc, cognitiveScores, currentY, margin, pageWidth, options)
  }

  // ===== 趨勢分析 =====
  if (options.includeTrends && trends && trends.length > 0) {
    currentY = ensurePageSpace(doc, currentY, 60, margin, pageHeight)
    currentY = drawTrendsSection(doc, trends, currentY, margin, pageWidth, options)
  }

  // ===== 近期方向提醒 =====
  if (options.quickDirectionInsight && options.quickDirectionInsight.hasEnoughGames) {
    currentY = ensurePageSpace(doc, currentY, 60, margin, pageHeight)
    currentY = drawQuickDirectionSection(doc, options.quickDirectionInsight, currentY, margin, pageWidth)
  }

  // ===== 行為分析摘要 =====
  if (options.includeBehavior && behaviorSummary) {
    currentY = ensurePageSpace(doc, currentY, 50, margin, pageHeight)
    currentY = drawBehaviorSection(doc, behaviorSummary, currentY, margin, pageWidth)
  }

  // ===== 營養建議頁 =====
  if (options.includeNutrition && nutritionData && nutritionData.recommendations.length > 0) {
    doc.addPage()
    currentY = margin
    currentY = drawNutritionSection(doc, nutritionData, currentY, margin, pageWidth, pageHeight)
  }

  // ===== 法律聲明 =====
  // 確保在新頁面上
  currentY = ensurePageSpace(doc, currentY, 100, margin, pageHeight)
  drawLegalDisclaimer(doc, currentY, margin, pageWidth, pageHeight, options.language || 'bilingual')

  // ===== 頁尾 =====
  addPageNumbers(doc)

  return doc.output('blob')
}

/**
 * 繪製報告標題（含 LOGO）
 */
function drawReportHeader(
  doc: jsPDF, 
  startY: number, 
  pageWidth: number, 
  margin: number
): number {
  let y = startY

  // 嘗試添加 LOGO
  if (LOGO_BASE64) {
    const logoX = pageWidth / 2 - LOGO_WIDTH / 2
    doc.addImage(LOGO_BASE64, 'PNG', logoX, y, LOGO_WIDTH, LOGO_HEIGHT)
    y += LOGO_HEIGHT + 5
  }

  // 主標題
  doc.setFontSize(FONT_SIZES.title)
  doc.setTextColor(COLORS.primary)
  doc.text('認知功能評估報告', pageWidth / 2, y, { align: 'center' })
  y += 6

  // 英文副標題
  doc.setFontSize(FONT_SIZES.body)
  doc.setTextColor(COLORS.lightText)
  doc.text('Cognitive Function Assessment Report', pageWidth / 2, y, { align: 'center' })
  y += 10

  // 分隔線
  doc.setDrawColor(COLORS.primary)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  return y
}

/**
 * 繪製患者資訊
 */
function drawPatientInfo(
  doc: jsPDF,
  userInfo: ReportUserInfo,
  startY: number,
  margin: number,
  pageWidth: number
): number {
  let y = startY

  doc.setFontSize(FONT_SIZES.heading)
  doc.setTextColor(COLORS.text)
  doc.text('基本資料 Basic Information', margin, y)
  y += LINE_HEIGHTS.heading

  doc.setFontSize(FONT_SIZES.body)
  doc.setTextColor(COLORS.secondary)

  const infoItems = [
    { label: '姓名 Name:', value: userInfo.name },
    { label: '年齡 Age:', value: `${userInfo.age} 歲` },
    { label: '教育年數 Education:', value: `${userInfo.educationYears} 年` },
    { label: '報告日期 Report Date:', value: userInfo.reportDate },
  ]

  const labelWidth = 42
  const valueWidth = pageWidth - margin * 2 - labelWidth

  for (const item of infoItems) {
    doc.setTextColor(COLORS.lightText)
    doc.text(item.label, margin, y)
    doc.setTextColor(COLORS.text)
    y = drawWrappedText(doc, item.value, margin + labelWidth, y, valueWidth, LINE_HEIGHTS.body)
    y += 1
  }

  return y + 4
}

/**
 * 繪製 Mini-Cog 評估區塊
 */
function drawMiniCogSection(
  doc: jsPDF,
  data: MiniCogReportData,
  startY: number,
  margin: number,
  pageWidth: number,
  options: PdfReportOptions
): number {
  let y = startY

  y = drawSectionHeader(doc, 'Mini-Cog 認知篩檢結果', y, margin, pageWidth)

  // 分數摘要表格
  const tableData = [
    ['評估項目', '分數', '滿分', '說明'],
    ['三詞回憶 Word Recall', data.wordRecallScore.toString(), '3', '短期記憶評估'],
    ['時鐘繪圖 Clock Drawing', data.clockDrawingScore.toString(), '2', '視覺空間與執行功能'],
    ['總分 Total Score', data.totalScore.toString(), '5', ''],
  ]

  y = drawSimpleTable(doc, tableData, margin, y, pageWidth - margin * 2)
  y += 5

  // 風險評估
  const riskLevel = data.atRisk ? 'high' : 'low'
  const riskText = data.atRisk 
    ? '⚠️ 建議進一步評估 Suggests need for further evaluation'
    : '✓ 未發現明顯異常 No significant abnormalities detected'
  
  doc.setFontSize(FONT_SIZES.body)
  doc.setTextColor(RISK_COLORS[riskLevel])
  y = drawWrappedText(doc, `風險評估 Risk Assessment: ${riskText}`, margin, y, pageWidth - margin * 2, LINE_HEIGHTS.body)
  y += 4

  // 測驗詳情
  doc.setFontSize(FONT_SIZES.small)
  doc.setTextColor(COLORS.lightText)
  y = drawWrappedText(
    doc,
    `完成時間: ${Math.round(data.duration / 1000)}秒 | 測驗日期: ${data.completedAt.split('T')[0]}`,
    margin,
    y,
    pageWidth - margin * 2,
    LINE_HEIGHTS.small
  )
  y += 2

  if (data.clockSelfAssessment) {
    y = drawWrappedText(doc, `時鐘自評分數: ${data.clockSelfAssessment}/5`, margin, y, pageWidth - margin * 2, LINE_HEIGHTS.small)
    y += 2
  }

  // 時鐘繪圖圖片
  if (options.includeClockDrawing && data.clockImageData) {
    y += 3
    doc.setFontSize(FONT_SIZES.small)
    doc.setTextColor(COLORS.text)
    doc.text('時鐘繪圖記錄 Clock Drawing:', margin, y)
    y += 3
    
    try {
      const imgWidth = 50
      const imgHeight = 50
      y = ensurePageSpace(doc, y, imgHeight + 5, margin, doc.internal.pageSize.getHeight())
      doc.addImage(data.clockImageData, 'PNG', margin, y, imgWidth, imgHeight)
      y += imgHeight + 5
    } catch {
      doc.text('[圖片無法顯示]', margin, y)
      y += 5
    }
  }

  return y + 5
}

/**
 * 繪製認知功能分數區塊
 */
function drawCognitiveScoresSection(
  doc: jsPDF,
  scores: CognitiveScoreData,
  startY: number,
  margin: number,
  pageWidth: number,
  options: PdfReportOptions
): number {
  let y = startY

  y = drawSectionHeader(doc, '認知功能領域評估 Cognitive Domain Assessment', y, margin, pageWidth)

  // 如果有雷達圖圖片，優先使用圖片
  if (options.radarChartImage) {
    try {
      const imgWidth = 120
      const imgHeight = 100
      const x = (pageWidth - imgWidth) / 2
      y = ensurePageSpace(doc, y, imgHeight + 5, margin, doc.internal.pageSize.getHeight())
      doc.addImage(options.radarChartImage, 'PNG', x, y, imgWidth, imgHeight)
      y += imgHeight + 5
    } catch (e) {
      console.warn('無法繪製雷達圖', e)
    }
  } 
  
  // 繪製簡易條形圖 (作為補充或備用)
  // 如果有雷達圖，條形圖可以縮小或省略，這裡選擇保留但作為詳細數據列表
  const domains = [
    { name: '記憶力 Memory', score: scores.memory },
    { name: '注意力 Attention', score: scores.attention },
    { name: '處理速度 Processing', score: scores.processing },
    { name: '執行功能 Executive', score: scores.executive },
    { name: '語言能力 Language', score: scores.language },
  ]

  const barHeight = 6
  const barMaxWidth = pageWidth - margin * 2 - 60
  const labelWidth = 55

  for (const domain of domains) {
    y = ensurePageSpace(doc, y, barHeight + 6, margin, doc.internal.pageSize.getHeight())
    // 標籤
    doc.setFontSize(FONT_SIZES.small)
    doc.setTextColor(COLORS.text)
    doc.text(domain.name, margin, y + barHeight / 2 + 1)

    // 背景條
    doc.setFillColor(COLORS.border)
    doc.rect(margin + labelWidth, y, barMaxWidth, barHeight, 'F')

    // 分數條
    const barWidth = (domain.score / 100) * barMaxWidth
    const barColor = domain.score >= 70 ? COLORS.success : domain.score >= 40 ? COLORS.warning : COLORS.danger
    doc.setFillColor(barColor)
    doc.rect(margin + labelWidth, y, barWidth, barHeight, 'F')

    // 分數文字
    doc.setFontSize(FONT_SIZES.small)
    doc.setTextColor(COLORS.text)
    doc.text(`${Math.round(domain.score)}%`, margin + labelWidth + barMaxWidth + 3, y + barHeight / 2 + 1)

    y += barHeight + 4
  }

  return y + 5
}

/**
 * 繪製趨勢分析區塊
 */
function drawTrendsSection(
  doc: jsPDF,
  trends: TrendDataPoint[],
  startY: number,
  margin: number,
  pageWidth: number,
  options: PdfReportOptions
): number {
  let y = startY

  y = drawSectionHeader(doc, '表現趨勢分析 Performance Trends', y, margin, pageWidth)

  // 如果有趨勢圖圖片，優先使用圖片
  if (options.trendChartImage) {
    try {
      const imgWidth = 160
      const imgHeight = 80
      const x = (pageWidth - imgWidth) / 2
      y = ensurePageSpace(doc, y, imgHeight + 5, margin, doc.internal.pageSize.getHeight())
      doc.addImage(options.trendChartImage, 'PNG', x, y, imgWidth, imgHeight)
      y += imgHeight + 5
    } catch (e) {
      console.warn('無法繪製趨勢圖', e)
    }
  }

  // 繪製趨勢表格
  const tableData: string[][] = [['日期 Date', '分數 Score', '遊戲類型 Game Type']]
  
  // 只取最近 10 筆
  const recentTrends = trends.slice(-10)
  for (const point of recentTrends) {
    tableData.push([
      point.date,
      point.score.toString(),
      point.gameType || '-'
    ])
  }

  y = drawSimpleTable(doc, tableData, margin, y, pageWidth - margin * 2)

  // 趨勢說明
  if (trends.length >= 2) {
    const firstScore = trends[0]?.score || 0
    const lastScore = trends[trends.length - 1]?.score || 0
    const change = lastScore - firstScore
    const trendText = change > 0 
      ? `整體表現逐步進步（變化 +${change.toFixed(1)} 分）`
      : change < 0
        ? `整體表現略有下滑（變化 ${change.toFixed(1)} 分）`
        : '整體表現大致穩定'
    
    y += 5
    doc.setFontSize(FONT_SIZES.small)
    doc.setTextColor(COLORS.text)
    y = drawWrappedText(doc, trendText, margin, y, pageWidth - margin * 2, LINE_HEIGHTS.small)
  }

  return y + 8
}

/**
 * 繪製近期方向提醒區塊
 */
function drawQuickDirectionSection(
  doc: jsPDF,
  insight: TrainingDirectionInsight,
  startY: number,
  margin: number,
  pageWidth: number
): number {
  let y = startY
  y = drawSectionHeader(doc, '近期方向提醒 Quick Direction Summary', y, margin, pageWidth)

  const cardWidth = pageWidth - margin * 2
  const cardHeight = 34
  const deltaColor = insight.scoreDelta >= 0 ? COLORS.success : COLORS.warning
  const deltaText = `${insight.scoreDelta >= 0 ? '+' : ''}${insight.scoreDelta.toFixed(1)} 分`

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(COLORS.border)
  doc.rect(margin, y, cardWidth, cardHeight, 'FD')

  doc.setFontSize(FONT_SIZES.small)
  doc.setTextColor(COLORS.lightText)
  doc.text('最近一段平均', margin + 4, y + 7)
  doc.text('前一段平均', margin + 38, y + 7)
  doc.text('分數變化', margin + 72, y + 7)

  doc.setFontSize(FONT_SIZES.body)
  doc.setTextColor(COLORS.text)
  doc.text(`${insight.recentAverage.toFixed(1)} 分`, margin + 4, y + 13)
  doc.text(`${insight.previousAverage.toFixed(1)} 分`, margin + 38, y + 13)
  doc.setTextColor(deltaColor)
  doc.text(deltaText, margin + 72, y + 13)

  doc.setFontSize(FONT_SIZES.small)
  doc.setTextColor(COLORS.text)
  const summaryLines = splitTextLines(doc, insight.message, cardWidth - 8)
  doc.text(summaryLines, margin + 4, y + 20)

  y += cardHeight + 4

  doc.setFontSize(FONT_SIZES.small)
  doc.setTextColor(COLORS.primary)
  y = drawWrappedText(doc, `建議：${insight.careSuggestion}`, margin, y, cardWidth, LINE_HEIGHTS.small)
  y += 2

  if (insight.domainInsights.length > 0) {
    const domainText = insight.domainInsights
      .map(item => `${item.domain}${item.delta >= 0 ? '+' : ''}${item.delta.toFixed(1)}`)
      .join('、')
    doc.setTextColor(COLORS.lightText)
    y = drawWrappedText(doc, `重點領域變化：${domainText}`, margin, y, cardWidth, LINE_HEIGHTS.small)
    y += 2
  }

  return y + 3
}

/**
 * 繪製行為分析區塊
 */
function drawBehaviorSection(
  doc: jsPDF,
  behavior: BehaviorSummary,
  startY: number,
  margin: number,
  pageWidth: number
): number {
  let y = startY

  y = drawSectionHeader(doc, '行為模式分析 Behavioral Pattern Analysis', y, margin, pageWidth)

  doc.setFontSize(FONT_SIZES.body)
  doc.setTextColor(COLORS.text)

  const items = [
    { label: '思考時間模式 Thinking Pattern:', value: behavior.thinkingTimePattern },
    { label: '決策穩定性 Decision Stability:', value: behavior.decisionStability },
    { label: '疲勞程度 Fatigue Level:', value: behavior.fatigueLevel },
    { label: '注意力品質 Attention Quality:', value: behavior.attentionQuality },
  ]

  for (const item of items) {
    doc.setTextColor(COLORS.lightText)
    doc.text(item.label, margin, y)
    doc.setTextColor(COLORS.text)
    y = drawWrappedText(doc, item.value, margin + 55, y, pageWidth - margin * 2 - 55, LINE_HEIGHTS.body)
    y += 1
  }

  return y + 5
}

/**
 * 繪製營養建議區塊
 */
function drawNutritionSection(
  doc: jsPDF,
  nutrition: NutritionReportData,
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number
): number {
  let y = startY

  y = drawSectionHeader(doc, '個人化營養建議 Personalized Nutrition Recommendations', y, margin, pageWidth)

  // 免責聲明提醒
  doc.setFontSize(FONT_SIZES.small)
  doc.setTextColor(COLORS.warning)
  y = drawWrappedText(
    doc,
    '以下建議僅供參考，開始任何補充計畫前請諮詢專業醫療人員',
    margin,
    y,
    pageWidth - margin * 2,
    LINE_HEIGHTS.small
  )
  doc.setTextColor(COLORS.lightText)
  y = drawWrappedText(
    doc,
    'The following suggestions are for reference only. Consult a healthcare professional before starting any supplement plan.',
    margin,
    y,
    pageWidth - margin * 2,
    LINE_HEIGHTS.small
  )
  y += 6

  // 高優先建議
  const highPriority = nutrition.recommendations.filter(r => r.priority === 'high')
  if (highPriority.length > 0) {
    y = drawNutritionPriorityGroup(doc, '🔴 重點關注 High Priority', highPriority, y, margin, pageWidth, pageHeight, COLORS.danger)
  }

  // 中優先建議
  const mediumPriority = nutrition.recommendations.filter(r => r.priority === 'medium')
  if (mediumPriority.length > 0) {
    y = drawNutritionPriorityGroup(doc, '🟡 建議考慮 Recommended', mediumPriority, y, margin, pageWidth, pageHeight, COLORS.warning)
  }

  // 認知評估建議
  if (nutrition.cognitiveAdvice.length > 0) {
    y += 5
    y = ensurePageSpace(doc, y, 40, margin, pageHeight)

    doc.setFontSize(FONT_SIZES.body)
    doc.setTextColor(COLORS.primary)
    doc.text('🧠 認知評估建議 Cognitive Assessment Advice', margin, y)
    y += 6

    doc.setFontSize(FONT_SIZES.small)
    doc.setTextColor(COLORS.text)
    for (const advice of nutrition.cognitiveAdvice) {
      const adviceLines = splitTextLines(doc, `‧ ${advice}`, pageWidth - margin * 2 - 3)
      const adviceHeight = adviceLines.length * LINE_HEIGHTS.small + 1
      y = ensurePageSpace(doc, y, adviceHeight, margin, pageHeight)
      y = drawWrappedText(doc, `‧ ${advice}`, margin + 3, y, pageWidth - margin * 2 - 3, LINE_HEIGHTS.small)
      y += 1
    }
  }

  // 一般保健建議
  if (nutrition.generalAdvice.length > 0) {
    y += 5
    y = ensurePageSpace(doc, y, 40, margin, pageHeight)

    doc.setFontSize(FONT_SIZES.body)
    doc.setTextColor(COLORS.success)
    doc.text('💡 一般保健建議 General Health Advice', margin, y)
    y += 6

    doc.setFontSize(FONT_SIZES.small)
    doc.setTextColor(COLORS.text)
    for (const advice of nutrition.generalAdvice) {
      const adviceLines = splitTextLines(doc, `‧ ${advice}`, pageWidth - margin * 2 - 3)
      const adviceHeight = adviceLines.length * LINE_HEIGHTS.small + 1
      y = ensurePageSpace(doc, y, adviceHeight, margin, pageHeight)
      y = drawWrappedText(doc, `‧ ${advice}`, margin + 3, y, pageWidth - margin * 2 - 3, LINE_HEIGHTS.small)
      y += 1
    }
  }

  return y + 5
}

/**
 * 繪製營養建議優先級分組
 */
function drawNutritionPriorityGroup(
  doc: jsPDF,
  title: string,
  recommendations: NutritionReportData['recommendations'],
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  accentColor: string
): number {
  let y = startY

  // 分組標題
  doc.setFontSize(FONT_SIZES.body)
  doc.setTextColor(accentColor)
  doc.text(title, margin, y)
  y += 6

  const cardWidth = pageWidth - margin * 2
  const paddingX = 5
  const paddingY = 4
  const contentWidth = cardWidth - paddingX * 2
  const gap = 1.5

  for (const rec of recommendations) {
    doc.setFontSize(FONT_SIZES.body)
    const nameLines = splitTextLines(doc, rec.name, contentWidth)

    doc.setFontSize(FONT_SIZES.small)
    const reasonLines = splitTextLines(doc, rec.reason, contentWidth)

    const dosageLine = `建議劑量：${rec.dosage}`
    const partnerLine = rec.isPartnerProduct && rec.partnerName ? `合作資訊：${rec.partnerName}` : null

    const nameHeight = nameLines.length * LINE_HEIGHTS.body
    const reasonHeight = Math.max(1, reasonLines.length) * LINE_HEIGHTS.small
    const dosageHeight = LINE_HEIGHTS.tiny
    const partnerHeight = partnerLine ? LINE_HEIGHTS.tiny : 0

    const cardHeight = paddingY * 2 + nameHeight + gap + reasonHeight + gap + dosageHeight + (partnerLine ? gap + partnerHeight : 0)

    y = ensurePageSpace(doc, y, cardHeight + 4, margin, pageHeight)

    doc.setFillColor(COLORS.background)
    doc.setDrawColor(accentColor)
    doc.setLineWidth(0.3)
    doc.rect(margin, y, cardWidth, cardHeight, 'FD')

    doc.setFillColor(accentColor)
    doc.rect(margin, y, 2, cardHeight, 'F')

    let textY = y + paddingY + LINE_HEIGHTS.body

    doc.setFontSize(FONT_SIZES.body)
    doc.setTextColor(COLORS.text)
    doc.text(nameLines, margin + paddingX, textY)
    textY += nameHeight + gap

    doc.setFontSize(FONT_SIZES.small)
    doc.setTextColor(COLORS.lightText)
    doc.text(reasonLines, margin + paddingX, textY)
    textY += reasonHeight + gap

    doc.setFontSize(FONT_SIZES.tiny)
    doc.setTextColor(COLORS.lightText)
    doc.text(dosageLine, margin + paddingX, textY)
    textY += dosageHeight

    if (partnerLine) {
      textY += gap
      doc.setTextColor(COLORS.primary)
      doc.text(partnerLine, margin + paddingX, textY)
    }

    y += cardHeight + 3
  }

  return y + 3
}

/**
 * 繪製法律聲明
 */
function drawLegalDisclaimer(
  doc: jsPDF,
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  language: 'zh-TW' | 'en' | 'bilingual'
): void {
  let y = startY

  // 分隔線
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // 標題
  doc.setFontSize(FONT_SIZES.heading)
  doc.setTextColor(COLORS.danger)
  doc.text('重要聲明 Important Disclaimer', margin, y)
  y += 8

  doc.setFontSize(FONT_SIZES.tiny)
  doc.setTextColor(COLORS.lightText)

  const disclaimerZH = [
    '【中文聲明】',
    '1. 本報告僅供參考，不構成任何醫療診斷或治療建議。',
    '2. 本評估工具為認知訓練輔助工具，非經醫療機構認證之診斷工具。',
    '3. 如有任何健康疑慮，請諮詢合格醫療專業人員。',
    '4. 本報告數據來自使用者自主進行的訓練活動，可能受環境、',
    '   情緒、疲勞等因素影響。',
    '5. 評估結果不應作為失智症或其他認知疾病的診斷依據。',
    '6. 本系統符合個人資料保護法規定，所有數據僅儲存於使用者裝置。',
  ]

  const disclaimerEN = [
    '',
    '【English Disclaimer】',
    '1. This report is for reference only and does not constitute medical diagnosis',
    '   or treatment advice.',
    '2. This assessment tool is a cognitive training aid, not a certified diagnostic',
    '   instrument by medical institutions.',
    '3. Please consult qualified healthcare professionals for any health concerns.',
    '4. The data in this report comes from self-directed training activities and may',
    '   be affected by environmental, emotional, and fatigue factors.',
    '5. Assessment results should not be used as a basis for diagnosing dementia',
    '   or other cognitive disorders.',
    '6. This system complies with personal data protection regulations. All data is',
    '   stored only on the user\'s device.',
  ]

  let lines: string[] = []
  if (language === 'zh-TW') {
    lines = disclaimerZH
  } else if (language === 'en') {
    lines = disclaimerEN.slice(1) // 移除空行
  } else {
    lines = [...disclaimerZH, ...disclaimerEN]
  }

  const lineHeight = LINE_HEIGHTS.tiny
  for (const line of lines) {
    if (y + lineHeight > pageHeight - 15) {
      doc.addPage()
      y = margin
    }
    const wrapped = splitTextLines(doc, line, pageWidth - margin * 2)
    doc.text(wrapped, margin, y)
    y += wrapped.length * lineHeight
  }

  // 報告產生時間
  y += 3
  doc.setFontSize(FONT_SIZES.tiny)
  doc.setTextColor(COLORS.lightText)
  doc.text(`報告產生時間 Report Generated: ${new Date().toISOString()}`, margin, y)
}

/**
 * 繪製簡易表格
 */
function drawSimpleTable(
  doc: jsPDF,
  data: string[][],
  x: number,
  y: number,
  width: number
): number {
  const cols = data[0]?.length || 1
  const colWidth = width / cols
  const cellPaddingX = 3
  const cellPaddingY = 2
  const lineHeight = LINE_HEIGHTS.small

  doc.setFontSize(FONT_SIZES.small)
  doc.setLineWidth(0.1)
  doc.setDrawColor(COLORS.border)

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue

    const rowLines = row.map(cell => splitTextLines(doc, String(cell ?? ''), colWidth - cellPaddingX * 2))
    const maxLines = rowLines.reduce((max, lines) => Math.max(max, lines.length), 1)
    const rowHeight = cellPaddingY * 2 + maxLines * lineHeight

    const nextY = y + rowHeight
    const pageHeight = doc.internal.pageSize.getHeight()
    if (nextY > pageHeight - 15) {
      doc.addPage()
      y = 15
    }

    // 表頭
    if (i === 0) {
      doc.setFillColor(COLORS.primary)
      doc.rect(x, y, width, rowHeight, 'F')
      doc.setTextColor('#ffffff')
    } else {
      // 斑馬紋
      doc.setFillColor(i % 2 === 0 ? '#ffffff' : COLORS.background)
      doc.rect(x, y, width, rowHeight, 'F')
      doc.setTextColor(COLORS.text)
    }

    // 外框
    doc.rect(x, y, width, rowHeight, 'S')

    // 單元格內容與垂直分隔線
    for (let j = 0; j < cols; j++) {
      const cellX = x + j * colWidth
      if (j > 0) doc.line(cellX, y, cellX, y + rowHeight)

      const lines = rowLines[j] || ['']
      const textY = y + cellPaddingY + lineHeight
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        doc.text(lines[lineIndex] ?? '', cellX + cellPaddingX, textY + lineIndex * lineHeight)
      }
    }

    y += rowHeight
  }

  return y
}

/**
 * 添加頁碼
 */
function addPageNumbers(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(FONT_SIZES.tiny)
    doc.setTextColor(COLORS.lightText)
    doc.text(
      `第 ${i} 頁，共 ${totalPages} 頁 | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
  }
}

// ===== 輔助函數 =====

/**
 * 下載 PDF
 */
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 預載字體（可在應用啟動時調用）
 */
export async function preloadFont(): Promise<void> {
  try {
    await loadChineseFont()
    console.log('PDF 字體預載完成')
  } catch (error) {
    console.warn('PDF 字體預載失敗:', error)
  }
}

export function isFontLoaded(): boolean {
  return fontLoaded
}

/**
 * 格式化認知分數為行為摘要
 */
export function formatBehaviorSummary(analysis: {
  thinkingTimeAnalysis?: { pattern: string }
  decisionStability?: { stability: string }
  fatigueIndicators?: { severity: string }
  attentionQuality?: { quality: string }
} | null): BehaviorSummary {
  if (!analysis) {
    return {
      thinkingTimePattern: '無資料',
      decisionStability: '無資料',
      fatigueLevel: '無資料',
      attentionQuality: '無資料',
    }
  }

  const patternMap: Record<string, string> = {
    'thoughtful': '深思熟慮型',
    'impulsive': '衝動反應型',
    'mixed': '混合型',
    'deliberate': '謹慎型',
  }

  const stabilityMap: Record<string, string> = {
    'stable': '穩定',
    'indecisive': '猶豫不決',
    'second-guessing': '反覆推翻',
  }

  const fatigueMap: Record<string, string> = {
    'none': '無疲勞',
    'mild': '輕度疲勞',
    'moderate': '中度疲勞',
    'severe': '重度疲勞',
  }

  const attentionMap: Record<string, string> = {
    'excellent': '優秀',
    'good': '良好',
    'fair': '尚可',
    'poor': '需加強',
  }

  return {
    thinkingTimePattern: patternMap[analysis.thinkingTimeAnalysis?.pattern || ''] || '無資料',
    decisionStability: stabilityMap[analysis.decisionStability?.stability || ''] || '無資料',
    fatigueLevel: fatigueMap[analysis.fatigueIndicators?.severity || ''] || '無資料',
    attentionQuality: attentionMap[analysis.attentionQuality?.quality || ''] || '無資料',
  }
}

function ensurePageSpace(doc: jsPDF, y: number, requiredHeight: number, margin: number, pageHeight: number): number {
  if (y + requiredHeight > pageHeight - margin) {
    doc.addPage()
    return margin
  }
  return y
}

function splitTextLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  const paragraphs = String(text ?? '').split('\n')
  const lines: string[] = []
  for (const p of paragraphs) {
    const wrapped = doc.splitTextToSize(p, maxWidth)
    if (wrapped.length === 0) {
      lines.push('')
    } else {
      lines.push(...wrapped)
    }
  }
  return lines
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = splitTextLines(doc, text, maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function drawSectionHeader(doc: jsPDF, title: string, y: number, margin: number, pageWidth: number): number {
  doc.setFillColor(COLORS.background)
  doc.rect(margin, y - 3, pageWidth - margin * 2, 9, 'F')
  doc.setFontSize(FONT_SIZES.heading)
  doc.setTextColor(COLORS.primary)
  doc.text(title, margin + 2, y + 3)
  return y + 12
}

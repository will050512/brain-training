/**
 * PDF 報告生成服務
 * 參考 MMSE/MoCA 台灣醫療系統報告格式
 * 支援繁體中文 (Noto Sans TC)、雙語法律聲明
 */

import jsPDF from 'jspdf'

// 引入 LOGO Base64（由 generate-icons 腳本產生）
let LOGO_BASE64: string | null = null
let LOGO_WIDTH = 40
let LOGO_HEIGHT = 12

// 動態載入 LOGO
async function loadLogo(): Promise<void> {
  try {
    const logoModule = await import('@/assets/logo-base64')
    LOGO_BASE64 = logoModule.LOGO_BASE64
    LOGO_WIDTH = logoModule.LOGO_WIDTH / 5  // 縮放至適合 PDF 的大小
    LOGO_HEIGHT = logoModule.LOGO_HEIGHT / 5
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
  language?: 'zh-TW' | 'en' | 'bilingual'
}

// ===== 常數定義 =====

// 字型快取 key
const FONT_CACHE_KEY = 'noto-sans-tc-font-cache'
const FONT_VERSION = '1.0'

// 顏色配置
const COLORS = {
  primary: '#4f46e5',
  secondary: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#1e293b',
  lightText: '#64748b',
  border: '#e2e8f0',
  background: '#f8fafc',
}

// 風險等級配色
const RISK_COLORS = {
  low: '#22c55e',
  moderate: '#f59e0b',
  high: '#ef4444',
}

// 字體大小配置
const FONT_SIZES = {
  title: 18,
  subtitle: 14,
  heading: 12,
  body: 10,
  small: 8,
  tiny: 7,
}

// ===== 字體管理 =====

let fontLoaded = false
let fontBase64: string | null = null

/**
 * 從 IndexedDB 快取載入字體
 */
async function loadFontFromCache(): Promise<string | null> {
  try {
    const cache = await caches.open(FONT_CACHE_KEY)
    const response = await cache.match(FONT_VERSION)
    if (response) {
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64 || null)
        }
        reader.readAsDataURL(blob)
      })
    }
  } catch {
    console.warn('無法從快取載入字體')
  }
  return null
}

/**
 * 儲存字體到 IndexedDB 快取
 */
async function saveFontToCache(fontData: ArrayBuffer): Promise<void> {
  try {
    const cache = await caches.open(FONT_CACHE_KEY)
    const blob = new Blob([fontData], { type: 'font/ttf' })
    const response = new Response(blob)
    await cache.put(FONT_VERSION, response)
  } catch {
    console.warn('無法儲存字體到快取')
  }
}

/**
 * 載入 Noto Sans TC 字體
 * 優先從快取載入，否則從 CDN 下載
 */
async function loadNotoSansTC(): Promise<string | null> {
  // 已載入則直接返回
  if (fontLoaded && fontBase64) {
    return fontBase64
  }

  // 嘗試從快取載入
  const cachedFont = await loadFontFromCache()
  if (cachedFont) {
    fontBase64 = cachedFont
    fontLoaded = true
    return fontBase64
  }

  // 定義字體下載來源（含備援）
  const fontUrls = [
    'https://cdn.jsdelivr.net/npm/@aspect-ux/noto-sans-tc@0.0.1/NotoSansTC-Regular.ttf',
    'https://unpkg.com/@aspect-ux/noto-sans-tc@0.0.1/NotoSansTC-Regular.ttf'
  ]
  
  for (const url of fontUrls) {
    try {
      const response = await fetch(url)
      if (!response.ok) continue
      
      const arrayBuffer = await response.arrayBuffer()
      
      // 儲存到快取
      await saveFontToCache(arrayBuffer)
      
      // 轉換為 base64
      const uint8Array = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i] as number)
      }
      fontBase64 = btoa(binary)
      fontLoaded = true
      
      return fontBase64
    } catch (error) {
      console.warn(`從 ${url} 下載字體失敗:`, error)
    }
  }

  console.error('所有字體來源下載失敗')
  return null
}

/**
 * 初始化 PDF 文件並設置中文字體
 */
async function initPdfWithFont(): Promise<jsPDF> {
  const fontData = await loadNotoSansTC()
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  if (fontData) {
    // 添加字體
    doc.addFileToVFS('NotoSansTC-Regular.ttf', fontData)
    doc.addFont('NotoSansTC-Regular.ttf', 'NotoSansTC', 'normal')
    doc.setFont('NotoSansTC')
  } else {
    console.warn('無法載入中文字體，使用預設字體')
    doc.setFont('helvetica')
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
  options: PdfReportOptions = {}
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
    if (currentY > pageHeight - 80) {
      doc.addPage()
      currentY = margin
    }
    currentY = drawCognitiveScoresSection(doc, cognitiveScores, currentY, margin, pageWidth)
  }

  // ===== 趨勢分析 =====
  if (options.includeTrends && trends && trends.length > 0) {
    if (currentY > pageHeight - 60) {
      doc.addPage()
      currentY = margin
    }
    currentY = drawTrendsSection(doc, trends, currentY, margin, pageWidth)
  }

  // ===== 行為分析摘要 =====
  if (options.includeBehavior && behaviorSummary) {
    if (currentY > pageHeight - 50) {
      doc.addPage()
      currentY = margin
    }
    currentY = drawBehaviorSection(doc, behaviorSummary, currentY, margin, pageWidth)
  }

  // ===== 法律聲明 =====
  // 確保在新頁面上
  if (currentY > pageHeight - 100) {
    doc.addPage()
    currentY = margin
  }
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
  y += 8

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
  y += 6

  doc.setFontSize(FONT_SIZES.body)
  doc.setTextColor(COLORS.secondary)

  const infoItems = [
    { label: '姓名 Name:', value: userInfo.name },
    { label: '年齡 Age:', value: `${userInfo.age} 歲` },
    { label: '教育年數 Education:', value: `${userInfo.educationYears} 年` },
    { label: '報告日期 Report Date:', value: userInfo.reportDate },
  ]

  const colWidth = (pageWidth - margin * 2) / 2
  
  for (let i = 0; i < infoItems.length; i += 2) {
    const leftItem = infoItems[i]
    const rightItem = infoItems[i + 1]
    
    if (leftItem) {
      doc.setTextColor(COLORS.lightText)
      doc.text(leftItem.label, margin, y)
      doc.setTextColor(COLORS.text)
      doc.text(leftItem.value, margin + 35, y)
    }
    
    if (rightItem) {
      doc.setTextColor(COLORS.lightText)
      doc.text(rightItem.label, margin + colWidth, y)
      doc.setTextColor(COLORS.text)
      doc.text(rightItem.value, margin + colWidth + 35, y)
    }
    
    y += 5
  }

  y += 5
  return y
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

  // 區塊標題
  doc.setFillColor(COLORS.background)
  doc.rect(margin, y - 3, pageWidth - margin * 2, 10, 'F')
  
  doc.setFontSize(FONT_SIZES.heading)
  doc.setTextColor(COLORS.primary)
  doc.text('Mini-Cog 認知篩檢結果', margin + 2, y + 3)
  y += 12

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
  doc.text(`風險評估 Risk Assessment: ${riskText}`, margin, y)
  y += 8

  // 測驗詳情
  doc.setFontSize(FONT_SIZES.small)
  doc.setTextColor(COLORS.lightText)
  doc.text(`完成時間: ${Math.round(data.duration / 1000)}秒 | 測驗日期: ${data.completedAt.split('T')[0]}`, margin, y)
  y += 5

  if (data.clockSelfAssessment) {
    doc.text(`時鐘自評分數: ${data.clockSelfAssessment}/5`, margin, y)
    y += 5
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
  pageWidth: number
): number {
  let y = startY

  // 區塊標題
  doc.setFillColor(COLORS.background)
  doc.rect(margin, y - 3, pageWidth - margin * 2, 10, 'F')
  
  doc.setFontSize(FONT_SIZES.heading)
  doc.setTextColor(COLORS.primary)
  doc.text('認知功能領域評估 Cognitive Domain Assessment', margin + 2, y + 3)
  y += 15

  // 繪製簡易條形圖
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
  pageWidth: number
): number {
  let y = startY

  // 區塊標題
  doc.setFillColor(COLORS.background)
  doc.rect(margin, y - 3, pageWidth - margin * 2, 10, 'F')
  
  doc.setFontSize(FONT_SIZES.heading)
  doc.setTextColor(COLORS.primary)
  doc.text('表現趨勢分析 Performance Trends', margin + 2, y + 3)
  y += 12

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
      ? `📈 整體呈上升趨勢 (變化: +${change.toFixed(1)})`
      : change < 0
        ? `📉 整體呈下降趨勢 (變化: ${change.toFixed(1)})`
        : '➡️ 整體表現穩定'
    
    y += 5
    doc.setFontSize(FONT_SIZES.small)
    doc.setTextColor(COLORS.text)
    doc.text(trendText, margin, y)
  }

  return y + 8
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

  // 區塊標題
  doc.setFillColor(COLORS.background)
  doc.rect(margin, y - 3, pageWidth - margin * 2, 10, 'F')
  
  doc.setFontSize(FONT_SIZES.heading)
  doc.setTextColor(COLORS.primary)
  doc.text('行為模式分析 Behavioral Pattern Analysis', margin + 2, y + 3)
  y += 12

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
    doc.text(item.value, margin + 55, y)
    y += 6
  }

  return y + 5
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

  const lineHeight = 3.5
  for (const line of lines) {
    if (y + lineHeight > pageHeight - 15) {
      doc.addPage()
      y = margin
    }
    doc.text(line, margin, y)
    y += lineHeight
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
  const rowHeight = 6
  const colWidths = data[0] ? data[0].map(() => width / (data[0]?.length || 1)) : []
  
  doc.setFontSize(FONT_SIZES.small)

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    
    // 表頭背景
    if (i === 0) {
      doc.setFillColor(COLORS.primary)
      doc.rect(x, y, width, rowHeight, 'F')
      doc.setTextColor('#ffffff')
    } else {
      // 交替行背景
      if (i % 2 === 0) {
        doc.setFillColor(COLORS.background)
        doc.rect(x, y, width, rowHeight, 'F')
      }
      doc.setTextColor(COLORS.text)
    }

    // 繪製單元格
    let cellX = x
    for (let j = 0; j < row.length; j++) {
      const cellWidth = colWidths[j] || 0
      doc.text(row[j] || '', cellX + 2, y + rowHeight / 2 + 1)
      cellX += cellWidth
    }

    // 繪製邊框
    doc.setDrawColor(COLORS.border)
    doc.setLineWidth(0.1)
    doc.rect(x, y, width, rowHeight, 'S')

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
    await loadNotoSansTC()
    console.log('PDF 字體預載完成')
  } catch (error) {
    console.warn('PDF 字體預載失敗:', error)
  }
}

/**
 * 檢查字體是否已載入
 */
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

<template>
  <div class="correlation-chart-container">
    <!-- 資料不足警告 -->
    <div v-if="!hasEnoughData" class="insufficient-data">
      <div class="warning-icon">📊</div>
      <h4 class="warning-title">統計資料不足</h4>
      <p class="warning-message">
        目前僅有 <strong>{{ dataCount }}</strong> 筆配對資料，
        需要至少 <strong>{{ MINIMUM_DATA_POINTS }}</strong> 筆才能進行統計分析。
      </p>
      <p class="warning-hint" v-if="quickInsight?.hasEnoughGames">
        已先提供即時方向分析，協助你不等待長週期也能看趨勢。
      </p>
      <p class="warning-hint" v-else>
        再完成 {{ quickInsight?.minimumGames || 6 }} 場遊戲可先啟用即時方向分析。
      </p>

      <div v-if="quickInsight?.hasEnoughGames" class="quick-insight">
        <h5 class="quick-title">近期方向提醒</h5>
        <p class="quick-message">{{ quickInsight.message }}</p>
        <p class="quick-suggestion">建議：{{ quickInsight.careSuggestion }}</p>
        <div class="quick-meta">
          <div class="quick-meta-item">
            <span>最近一段平均</span>
            <strong>{{ quickInsight.recentAverage.toFixed(1) }}</strong>
          </div>
          <div class="quick-meta-item">
            <span>前一段平均</span>
            <strong>{{ quickInsight.previousAverage.toFixed(1) }}</strong>
          </div>
          <div class="quick-meta-item">
            <span>分數變化</span>
            <strong :class="quickDeltaClass">{{ quickDeltaText }}</strong>
          </div>
        </div>

        <div v-if="quickInsight.domainInsights.length > 0" class="quick-domains">
          <span
            v-for="domain in quickInsight.domainInsights"
            :key="domain.domain"
            class="quick-domain-pill"
          >
            {{ domain.domain }} {{ domain.delta >= 0 ? '+' : '' }}{{ domain.delta.toFixed(1) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 有足夠資料時顯示圖表 -->
    <template v-else>
      <!-- 相關係數摘要 -->
      <div class="correlation-summary">
        <div class="coefficient-display" :style="{ borderColor: correlationColor }">
          <span class="coefficient-label">皮爾森相關係數</span>
          <span class="coefficient-value" :style="{ color: correlationColor }">
            {{ formattedCoefficient }}
          </span>
          <span class="coefficient-strength" :class="strengthClass">
            {{ strengthText }}
          </span>
        </div>
        
        <div class="correlation-meta">
          <div class="meta-item">
            <span class="meta-label">資料點數</span>
            <span class="meta-value">{{ dataCount }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">統計顯著性</span>
            <span class="meta-value" :class="{ significant: isSignificant }">
              {{ isSignificant ? '顯著 (p < 0.05)' : '不顯著' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 散點圖 -->
      <div ref="chartRef" class="scatter-chart"></div>

      <!-- 分析說明 -->
      <div class="analysis-description">
        <h4 class="desc-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          分析說明
        </h4>
        <p class="desc-text">{{ analysisMessage }}</p>
      </div>

      <!-- 認知領域關聯 -->
      <div v-if="domainCorrelations.length > 0" class="domain-correlations">
        <h4 class="section-title">各認知領域關聯分析</h4>
        <div class="domain-grid">
          <div 
            v-for="domain in domainCorrelations" 
            :key="domain.domain"
            class="domain-card"
          >
            <span class="domain-name">{{ domain.name }}</span>
            <span 
              v-if="domain.hasEnoughData"
              class="domain-coefficient"
              :style="{ color: domain.color }"
            >
              r = {{ domain.coefficient.toFixed(3) }}
            </span>
            <span v-else class="domain-insufficient">資料不足</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useTheme } from '@/composables/useTheme'
import { getAppFontFamily } from '@/utils/typography'
import { 
  getMiniCogGameCorrelationData,
  analyzeMiniCogGameCorrelation, 
  analyzeTrainingDirection,
  analyzeByDomain,
  MINIMUM_DATA_POINTS,
  getCorrelationColor,
  type CorrelationDataPoint,
  type CorrelationResult,
  type DomainCorrelation,
  type TrainingDirectionInsight
} from '@/services/correlationAnalysisService'
import type { MiniCogResult } from '@/services/miniCogService'
import type { GameSession } from '@/types/game'

interface Props {
  miniCogResults?: MiniCogResult[]
  gameSessions?: GameSession[]
}

const props = withDefaults(defineProps<Props>(), {
  miniCogResults: () => [],
  gameSessions: () => []
})

const { isDark } = useTheme()

// 圖表 ref
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// 資料狀態
const hasEnoughData = ref(false)
const dataCount = ref(0)
const dataPoints = ref<CorrelationDataPoint[]>([])
const correlation = ref<CorrelationResult | null>(null)
const analysisMessage = ref('')
const quickInsight = ref<TrainingDirectionInsight | null>(null)
const domainCorrelations = ref<(DomainCorrelation & { name: string; hasEnoughData: boolean; coefficient: number; color: string })[]>([])

// 計算屬性
const formattedCoefficient = computed(() => {
  if (!correlation.value) return 'N/A'
  return correlation.value.coefficient.toFixed(3)
})

const correlationColor = computed(() => {
  if (!correlation.value) return '#9ca3af'
  return getCorrelationColor(correlation.value.strength, correlation.value.direction)
})

const strengthClass = computed(() => {
  if (!correlation.value) return ''
  return correlation.value.strength
})

const strengthText = computed(() => {
  if (!correlation.value) return ''
  const strengthMap: Record<string, string> = {
    'very-weak': '非常微弱',
    'weak': '微弱',
    'moderate': '中等',
    'strong': '強',
    'very-strong': '非常強'
  }
  const directionMap: Record<string, string> = {
    'positive': '正',
    'negative': '負',
    'none': '無'
  }
  return `${strengthMap[correlation.value.strength]}${directionMap[correlation.value.direction]}相關`
})

const isSignificant = computed(() => {
  return correlation.value?.isSignificant || false
})

const quickDeltaText = computed(() => {
  const delta = quickInsight.value?.scoreDelta ?? 0
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`
})

const quickDeltaClass = computed(() => {
  const direction = quickInsight.value?.direction
  if (direction === 'improving') return 'quick-delta-up'
  if (direction === 'declining') return 'quick-delta-down'
  return 'quick-delta-flat'
})

// 載入資料
function loadData() {
  try {
    quickInsight.value = analyzeTrainingDirection(props.miniCogResults, props.gameSessions)

    // 主要關聯分析
    const result = analyzeMiniCogGameCorrelation(props.miniCogResults, props.gameSessions)
    hasEnoughData.value = result.hasEnoughData
    dataCount.value = result.dataPoints.length
    dataPoints.value = result.dataPoints
    correlation.value = result.correlation
    analysisMessage.value = result.message

    // 各領域關聯分析
    if (result.hasEnoughData) {
      const domains = analyzeByDomain(props.miniCogResults, props.gameSessions)
      domainCorrelations.value = domains.map(d => ({
        ...d,
        name: d.domain,
        hasEnoughData: d.correlation !== null,
        coefficient: d.correlation?.coefficient || 0,
        color: d.correlation 
          ? getCorrelationColor(d.correlation.strength, d.correlation.direction)
          : '#9ca3af'
      }))
    } else {
      domainCorrelations.value = []
    }

    // 更新圖表
    if (hasEnoughData.value) {
      nextTick().then(() => initChart())
    }
  } catch (error) {
    console.error('載入關聯分析資料失敗:', error)
  }
}

// 等待下一個 tick
function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// 初始化圖表
function initChart() {
  if (!chartRef.value || !hasEnoughData.value) return

  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(chartRef.value)
  
  const option = getChartOption()
  chartInstance.setOption(option)
}

// 圖表配置
function getChartOption(): echarts.EChartsOption {
  const textColor = isDark.value ? '#e5e7eb' : '#374151'
  const gridColor = isDark.value ? '#374151' : '#e5e7eb'
  const bgColor = isDark.value ? '#1f2937' : '#ffffff'
  const fontFamily = getAppFontFamily()

  // 準備散點資料
  const scatterData = dataPoints.value.map(d => [d.miniCogScore, d.averageGameScore])

  // 計算迴歸線
  const { slope, intercept } = calculateRegression(
    dataPoints.value.map(d => d.miniCogScore),
    dataPoints.value.map(d => d.averageGameScore)
  )
  
  // Mini-Cog 分數範圍 0-5
  const minX = 0
  const maxX = 5
  const lineData = [
    [minX, slope * minX + intercept],
    [maxX, slope * maxX + intercept]
  ]

  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: textColor,
      fontFamily,
    },
    tooltip: {
      trigger: 'item',
      textStyle: {
        color: textColor,
        fontFamily,
      },
      formatter: (params: unknown) => {
        const p = params as { data?: number[] }
        if (p.data && Array.isArray(p.data) && p.data.length >= 2) {
          const score0 = p.data[0] ?? 0
          const score1 = p.data[1] ?? 0
          return `Mini-Cog: ${score0}分<br/>遊戲平均: ${score1.toFixed(1)}分`
        }
        return ''
      }
    },
    grid: {
      top: 40,
      right: 20,
      bottom: 50,
      left: 60,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: 'Mini-Cog 評估分數',
      nameLocation: 'middle',
      nameGap: 30,
      min: 0,
      max: 5,
      nameTextStyle: {
        color: textColor,
        fontSize: 12,
        fontFamily,
      },
      axisLine: {
        lineStyle: { color: gridColor }
      },
      axisLabel: {
        color: textColor,
        fontFamily,
      },
      splitLine: {
        lineStyle: { color: gridColor, type: 'dashed' }
      }
    },
    yAxis: {
      type: 'value',
      name: '遊戲訓練平均分數',
      nameLocation: 'middle',
      nameGap: 45,
      nameTextStyle: {
        color: textColor,
        fontSize: 12,
        fontFamily,
      },
      axisLine: {
        lineStyle: { color: gridColor }
      },
      axisLabel: {
        color: textColor,
        fontFamily,
      },
      splitLine: {
        lineStyle: { color: gridColor, type: 'dashed' }
      }
    },
    series: [
      {
        name: '資料點',
        type: 'scatter',
        symbolSize: 14,
        data: scatterData,
        itemStyle: {
          color: '#667eea',
          opacity: 0.8
        },
        emphasis: {
          itemStyle: {
            color: '#764ba2',
            shadowBlur: 10,
            shadowColor: 'rgba(102, 126, 234, 0.5)'
          }
        }
      },
      {
        name: '迴歸線',
        type: 'line',
        data: lineData,
        smooth: false,
        showSymbol: false,
        lineStyle: {
          color: correlationColor.value,
          width: 2,
          type: 'dashed'
        }
      }
    ]
  }
}

// 計算線性迴歸
function calculateRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length
  if (n === 0) return { slope: 0, intercept: 0 }

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * (y[i] ?? 0), 0)
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  return { slope: isNaN(slope) ? 0 : slope, intercept: isNaN(intercept) ? 0 : intercept }
}

// 視窗大小變化時重繪圖表
function handleResize() {
  chartInstance?.resize()
}

// 監聽主題變化
watch(isDark, () => {
  if (hasEnoughData.value) {
    initChart()
  }
})

// 監聽資料變化（例如舊用戶升版後，背景同步把資料補齊）
watch(
  () => [props.miniCogResults, props.gameSessions],
  () => {
    loadData()
  },
  { deep: true }
)

// 生命週期
onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})

// 暴露刷新方法
defineExpose({
  refresh: loadData
})
</script>

<style scoped>
.correlation-chart-container {
  padding: 20px;
}

/* 資料不足警告 */
.insufficient-data {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 16px;
}

.warning-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.warning-title {
  font-size: 20px;
  font-weight: 700;
  color: #92400e;
  margin: 0 0 12px 0;
}

.warning-message {
  font-size: 14px;
  color: #78350f;
  margin: 0 0 8px 0;
  line-height: 1.6;
}

.warning-message strong {
  font-weight: 700;
  color: #92400e;
}

.warning-hint {
  font-size: 13px;
  color: #a16207;
  margin: 0;
}

.quick-insight {
  margin-top: 16px;
  text-align: left;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  padding: 14px;
}

.quick-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary, #1f2937);
}

.quick-message {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-primary, #1f2937);
}

.quick-suggestion {
  margin: 8px 0 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-primary, #4f46e5);
  font-weight: 600;
}

.quick-meta {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.quick-meta-item {
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
}

.quick-meta-item strong {
  font-size: 14px;
  color: var(--color-text-primary, #1f2937);
}

.quick-delta-up {
  color: var(--color-success, #16a34a) !important;
}

.quick-delta-down {
  color: var(--color-danger, #dc2626) !important;
}

.quick-delta-flat {
  color: var(--color-text-secondary, #6b7280) !important;
}

.quick-domains {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-domain-pill {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--color-bg-secondary, #f3f4f6);
  color: var(--color-text-secondary, #4b5563);
}

/* 相關係數摘要 */
.correlation-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.coefficient-display {
  flex: 1;
  min-width: 200px;
  padding: 20px;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 16px;
  border-left: 4px solid;
  text-align: center;
}

.coefficient-label {
  display: block;
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 8px;
}

.coefficient-value {
  display: block;
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
}

.coefficient-strength {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 8px;
  background: var(--color-bg-tertiary, #e5e7eb);
  color: var(--color-text-primary, #1f2937);
}

.coefficient-strength.very-strong {
  background: #dcfce7;
  color: #166534;
}

.coefficient-strength.strong {
  background: #d1fae5;
  color: #065f46;
}

.coefficient-strength.moderate {
  background: #fef3c7;
  color: #92400e;
}

.coefficient-strength.weak,
.coefficient-strength.very-weak {
  background: #f3f4f6;
  color: #4b5563;
}

.correlation-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
}

.meta-item {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 12px;
}

.meta-label {
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
}

.meta-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
}

.meta-value.significant {
  color: #10b981;
}

/* 散點圖 */
.scatter-chart {
  width: 100%;
  height: 300px;
  margin-bottom: 24px;
}

/* 分析說明 */
.analysis-description {
  padding: 16px;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 12px;
  margin-bottom: 24px;
}

.desc-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 8px 0;
}

.desc-title svg {
  color: var(--color-primary, #667eea);
}

.desc-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-primary, #1f2937);
}

/* 認知領域關聯 */
.domain-correlations {
  padding-top: 16px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 12px 0;
}

.domain-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.domain-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 12px;
  text-align: center;
}

.domain-name {
  font-size: 13px;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 4px;
}

.domain-coefficient {
  font-size: 16px;
  font-weight: 700;
}

.domain-insufficient {
  font-size: 12px;
  color: var(--color-text-muted, #9ca3af);
}

/* 深色模式 */
:global(.dark) .insufficient-data {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%);
}

:global(.dark) .warning-title {
  color: #fbbf24;
}

:global(.dark) .warning-message {
  color: #fcd34d;
}

:global(.dark) .warning-message strong {
  color: #fbbf24;
}

:global(.dark) .warning-hint {
  color: #f59e0b;
}

:global(.dark) .quick-insight {
  background: #1f2937;
  border-color: #374151;
}

:global(.dark) .quick-title,
:global(.dark) .quick-message,
:global(.dark) .quick-meta-item strong {
  color: #f9fafb;
}

:global(.dark) .quick-suggestion {
  color: #a5b4fc;
}

:global(.dark) .quick-meta-item,
:global(.dark) .quick-domain-pill {
  background: #374151;
  color: #d1d5db;
}

:global(.dark) .coefficient-display,
:global(.dark) .meta-item,
:global(.dark) .analysis-description,
:global(.dark) .domain-card {
  background: #374151;
}

:global(.dark) .coefficient-value,
:global(.dark) .meta-value,
:global(.dark) .desc-text {
  color: #f9fafb;
}

:global(.dark) .domain-correlations {
  border-top-color: #374151;
}

/* 響應式 */
@media (max-width: 767px) {
  .correlation-chart-container {
    padding: 16px;
  }

  .correlation-summary {
    flex-direction: column;
  }

  .coefficient-value {
    font-size: 28px;
  }

  .scatter-chart {
    height: 250px;
  }

  .domain-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-meta {
    grid-template-columns: 1fr;
  }
}
</style>

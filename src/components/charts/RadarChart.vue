<template>
  <div ref="chartRef" class="w-full" style="height: 350px;"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { CognitiveScores } from '@/types/cognitive'
import { COGNITIVE_DIMENSIONS } from '@/types/cognitive'

const props = withDefaults(defineProps<{
  scores: CognitiveScores
  previousScores?: CognitiveScores
  showReferenceLines?: boolean  // 是否顯示參考線（50/70/90）
}>(), {
  showReferenceLines: true
})

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

// 認知維度順序
const dimensions = ['reaction', 'logic', 'memory', 'cognition', 'coordination', 'attention'] as const

// 參考分數區間定義
const SCORE_ZONES = {
  warning: { max: 50, color: 'rgba(239, 68, 68, 0.15)', label: '需加強' },     // 紅色區域
  normal: { max: 70, color: 'rgba(251, 191, 36, 0.1)', label: '正常' },        // 黃色區域
  good: { max: 90, color: 'rgba(34, 197, 94, 0.08)', label: '良好' },          // 綠色區域
  excellent: { max: 100, color: 'rgba(59, 130, 246, 0.05)', label: '優秀' }    // 藍色區域
}

// 初始化圖表
function initChart(): void {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  updateChart()
}

// 更新圖表
function updateChart(): void {
  if (!chart) return

  const indicators = dimensions.map(dim => ({
    name: COGNITIVE_DIMENSIONS[dim].name,
    max: 100,
    color: COGNITIVE_DIMENSIONS[dim].color,
  }))

  const currentData = dimensions.map(dim => props.scores[dim])
  const previousData = props.previousScores 
    ? dimensions.map(dim => props.previousScores![dim])
    : null

  const series: echarts.RadarSeriesOption[] = []

  // 如果顯示參考線，先添加參考區域（從外到內）
  if (props.showReferenceLines) {
    // 90分參考線（優秀門檻）
    series.push({
      name: '優秀 (90分)',
      type: 'radar',
      silent: true,
      z: 1,
      data: [{
        value: dimensions.map(() => 90),
        symbol: 'none',
        lineStyle: {
          width: 1,
          color: '#22c55e',
          type: 'dashed',
          opacity: 0.6
        },
        areaStyle: { opacity: 0 }
      }]
    })

    // 70分參考線（正常門檻）
    series.push({
      name: '良好 (70分)',
      type: 'radar',
      silent: true,
      z: 1,
      data: [{
        value: dimensions.map(() => 70),
        symbol: 'none',
        lineStyle: {
          width: 1,
          color: '#fbbf24',
          type: 'dashed',
          opacity: 0.6
        },
        areaStyle: { opacity: 0 }
      }]
    })

    // 50分參考線（警戒門檻）
    series.push({
      name: '警戒 (50分)',
      type: 'radar',
      silent: true,
      z: 1,
      data: [{
        value: dimensions.map(() => 50),
        symbol: 'none',
        lineStyle: {
          width: 1.5,
          color: '#ef4444',
          type: 'dashed',
          opacity: 0.7
        },
        areaStyle: { opacity: 0 }
      }]
    })
  }

  // 主要數據系列
  const mainSeries: echarts.RadarSeriesOption = {
    name: '當前分數',
    type: 'radar',
    z: 10,
    data: [
      {
        value: currentData,
        name: '本週',
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 2,
          color: '#3b82f6',
        },
        areaStyle: {
          color: 'rgba(59, 130, 246, 0.3)',
        },
        itemStyle: {
          color: '#3b82f6',
        },
      },
    ],
  }

  // 如果有上週數據，添加比較線
  if (previousData && previousData.some(v => v > 0)) {
    const seriesData = mainSeries.data
    if (seriesData) {
      seriesData.push({
        value: previousData,
        name: '上週',
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          type: 'dashed',
          color: '#94a3b8',
        },
        areaStyle: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        itemStyle: {
          color: '#94a3b8',
        },
      } as never)
    }
  }

  series.push(mainSeries)

  // 建立分區顏色陣列（從外到內：優秀、良好、正常、警戒、危險）
  const splitAreaColors = props.showReferenceLines
    ? [
        SCORE_ZONES.excellent.color,  // 90-100
        SCORE_ZONES.good.color,       // 70-90
        SCORE_ZONES.normal.color,     // 50-70
        SCORE_ZONES.warning.color,    // 25-50
        'rgba(239, 68, 68, 0.2)'      // 0-25 深紅色
      ]
    : ['#fff', '#f8fafc']

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number[] }
        let html = `<strong>${p.name}</strong><br/>`
        dimensions.forEach((dim, i) => {
          const score = p.value[i]
          const status = score >= 90 ? '🌟' : score >= 70 ? '✅' : score >= 50 ? '⚠️' : '❗'
          html += `${COGNITIVE_DIMENSIONS[dim].icon} ${COGNITIVE_DIMENSIONS[dim].name}: ${score} 分 ${status}<br/>`
        })
        return html
      },
    },
    legend: {
      data: previousData && previousData.some(v => v > 0) ? ['本週', '上週'] : ['本週'],
      bottom: 0,
      textStyle: {
        fontSize: 14,
      },
    },
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 5,
      axisName: {
        color: '#333',
        fontSize: 14,
        fontWeight: 'bold',
      },
      splitLine: {
        lineStyle: {
          color: '#e2e8f0',
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: splitAreaColors,
        },
      },
      axisLine: {
        lineStyle: {
          color: '#e2e8f0',
        },
      },
    },
    series,
  }

  chart.setOption(option, true)
}

// 響應式調整
function handleResize(): void {
  chart?.resize()
}

// 監聽分數變化
watch(() => [props.scores, props.previousScores, props.showReferenceLines], () => {
  updateChart()
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

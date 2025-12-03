<template>
  <div ref="chartRef" class="w-full" style="height: 300px;"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { ScoreHistory } from '@/services/scoreCalculator'
import { COGNITIVE_DIMENSIONS, type CognitiveDimension } from '@/types/cognitive'

const props = withDefaults(defineProps<{
  history: ScoreHistory[]
  showWarningLines?: boolean  // 是否顯示警示線
  professionalMode?: boolean  // 專業模式使用更嚴格的閾值
}>(), {
  showWarningLines: true,
  professionalMode: false
})

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

// 認知維度順序
const dimensions: CognitiveDimension[] = ['reaction', 'logic', 'memory', 'cognition', 'coordination', 'attention']

// 初始化圖表
function initChart(): void {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  updateChart()
}

// 更新圖表
function updateChart(): void {
  if (!chart) return

  // 如果沒有歷史數據
  if (props.history.length === 0) {
    chart.setOption({
      title: {
        text: '尚無歷史數據',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#94a3b8',
          fontSize: 16,
        },
      },
    })
    return
  }

  // 格式化日期標籤
  const xAxisData = props.history.map(h => {
    const date = new Date(h.date)
    return `${date.getMonth() + 1}/${date.getDate()}`
  })

  // 建立每個維度的數據系列
  const series: echarts.LineSeriesOption[] = dimensions.map(dim => ({
    name: COGNITIVE_DIMENSIONS[dim].name,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    data: props.history.map(h => h.scores[dim]),
    lineStyle: {
      width: 2,
      color: COGNITIVE_DIMENSIONS[dim].color,
    },
    itemStyle: {
      color: COGNITIVE_DIMENSIONS[dim].color,
    },
    emphasis: {
      focus: 'series',
    },
  }))

  // 添加平均分數線
  series.push({
    name: '平均',
    type: 'line',
    smooth: true,
    symbol: 'diamond',
    symbolSize: 8,
    data: props.history.map(h => {
      const values = Object.values(h.scores) as number[]
      return Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length)
    }),
    lineStyle: {
      width: 3,
      color: '#1e40af',
      type: 'solid',
    },
    itemStyle: {
      color: '#1e40af',
    },
  })

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params: unknown) => {
        const p = params as Array<{ seriesName: string; value: number; color: string; dataIndex: number }>
        const firstItem = p[0]
        const dateLabel = firstItem ? xAxisData[firstItem.dataIndex] || '' : ''
        let html = `<strong>${dateLabel}</strong><br/>`
        p.forEach(item => {
          html += `<span style="color:${item.color}">●</span> ${item.seriesName}: ${item.value} 分<br/>`
        })
        return html
      },
    },
    legend: {
      data: [...dimensions.map(d => COGNITIVE_DIMENSIONS[d].name), '平均'],
      bottom: 0,
      type: 'scroll',
      textStyle: {
        fontSize: 12,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
      axisLabel: {
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitNumber: 5,
      axisLabel: {
        formatter: '{value}',
        fontSize: 12,
      },
    },
    series,
    // 添加警示區域標記
    ...(props.showWarningLines ? {
      visualMap: {
        show: false,
        pieces: [
          { min: 0, max: 50, color: 'rgba(239, 68, 68, 0.1)' },   // 警戒區
          { min: 50, max: 70, color: 'rgba(251, 191, 36, 0.1)' }, // 注意區
          { min: 70, max: 100, color: 'rgba(34, 197, 94, 0.1)' }  // 正常區
        ],
        seriesIndex: [series.length - 1], // 只應用於平均線
      }
    } : {}),
  }

  // 為平均線添加警示標線
  if (props.showWarningLines && series.length > 0) {
    const avgSeries = series[series.length - 1]
    const warningThreshold = props.professionalMode ? 70 : 60  // 專業模式: 70分, 一般模式: 60分
    const dangerThreshold = props.professionalMode ? 50 : 40   // 專業模式: 50分, 一般模式: 40分
    
    avgSeries.markLine = {
      silent: true,
      symbol: 'none',
      lineStyle: {
        type: 'dashed',
      },
      label: {
        position: 'insideEndTop',
        fontSize: 10,
      },
      data: [
        {
          yAxis: dangerThreshold,
          lineStyle: { color: '#ef4444', width: 2 },
          label: { 
            formatter: `警戒線 (${dangerThreshold}分)`,
            color: '#ef4444'
          }
        },
        {
          yAxis: warningThreshold,
          lineStyle: { color: '#f59e0b', width: 2 },
          label: { 
            formatter: `注意線 (${warningThreshold}分)`,
            color: '#f59e0b'
          }
        },
        {
          yAxis: 90,
          lineStyle: { color: '#22c55e', width: 1, type: 'dotted' },
          label: { 
            formatter: '優秀 (90分)',
            color: '#22c55e'
          }
        }
      ]
    }
    
    // 添加下降趨勢檢測標記
    if (props.history.length >= 3) {
      const avgScores = props.history.map(h => {
        const values = Object.values(h.scores) as number[]
        return values.reduce((a: number, b: number) => a + b, 0) / values.length
      })
      
      // 計算最近趨勢（最後3筆資料）
      const recentScores = avgScores.slice(-3)
      const firstRecent = recentScores[0]
      const lastRecent = recentScores[recentScores.length - 1]
      
      if (firstRecent && lastRecent) {
        const declineRate = ((firstRecent - lastRecent) / firstRecent) * 100
        const significantDecline = props.professionalMode ? 7 : 15  // 專業模式: 7%, 一般模式: 15%
        
        if (declineRate >= significantDecline) {
          // 在下降起點添加標記
          avgSeries.markPoint = {
            symbol: 'triangle',
            symbolSize: 15,
            symbolRotate: 180,
            label: {
              show: true,
              position: 'top',
              formatter: `↓${declineRate.toFixed(1)}%`,
              fontSize: 10,
              color: '#ef4444',
              fontWeight: 'bold'
            },
            itemStyle: {
              color: '#ef4444'
            },
            data: [
              {
                coord: [props.history.length - 1, lastRecent],
                value: declineRate.toFixed(1)
              }
            ]
          }
        }
      }
    }
  }

  chart.setOption(option, true)
}

// 響應式調整
function handleResize(): void {
  chart?.resize()
}

// 監聽歷史數據變化
watch(() => props.history, () => {
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

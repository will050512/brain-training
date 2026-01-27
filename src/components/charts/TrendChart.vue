<template>
  <div ref="chartRef" class="w-full" style="height: 300px;"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import type { ScoreHistory } from '@/services/scoreCalculator'
import { COGNITIVE_DIMENSIONS, type CognitiveDimension } from '@/types/cognitive'
import { useTheme } from '@/composables/useTheme'
import { getChartTheme } from '@/utils/chartTheme'
import { getAppFontFamily } from '@/utils/typography'

const props = withDefaults(defineProps<{
  history: ScoreHistory[]
  showWarningLines?: boolean  // 是否顯示警示線
  professionalMode?: boolean  // 專業模式使用更嚴格的閾值
  chartType?: 'line' | 'bar'
}>(), {
  showWarningLines: true,
  professionalMode: false,
  chartType: 'line'
})

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

// 主題相關
const { effectiveTheme } = useTheme()
const chartTheme = computed(() => getChartTheme(effectiveTheme.value))

// 認知維度順序
const dimensions: CognitiveDimension[] = ['reaction', 'logic', 'memory', 'cognition', 'coordination', 'attention']

// 初始化圖表
function initChart(): void {
  if (!chartRef.value) return
  
  // 如果已存在圖表，先銷毀
  if (chart) {
    chart.dispose()
    chart = null
  }
  
  chart = echarts.init(chartRef.value)
  updateChart()
}

// 更新圖表
function updateChart(): void {
  if (!chart) return

  // 取得當前主題配色
  const theme = chartTheme.value
  const fontFamily = getAppFontFamily()

  // 如果沒有歷史數據
  if (props.history.length === 0) {
    chart.setOption({
      title: {
        text: '尚無歷史數據',
        left: 'center',
        top: 'center',
        textStyle: {
          color: theme.textColorSecondary,
          fontSize: 16,
          fontFamily,
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

  const averageScores = props.history.map(h => {
    const values = Object.values(h.scores) as number[]
    return Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length)
  })

  // 建立每個維度的數據系列
  const series: Array<echarts.LineSeriesOption | echarts.BarSeriesOption> = []

  if (props.chartType === 'bar') {
    series.push({
      name: '平均',
      type: 'bar',
      barWidth: 18,
      data: averageScores.map(score => ({
        value: score,
        itemStyle: {
          color: score >= 80 ? theme.referenceLine.excellent : (score >= 60 ? theme.referenceLine.good : theme.referenceLine.warning),
        },
      })),
      emphasis: {
        focus: 'series',
      },
    })
  } else {
    dimensions.forEach(dim => {
      series.push({
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
      })
    })

    // 添加平均分數線
    const avgLineColor = effectiveTheme.value === 'dark' ? '#60a5fa' : '#1e40af'
    series.push({
      name: '平均',
      type: 'line',
      smooth: true,
      symbol: 'diamond',
      symbolSize: 8,
      data: averageScores,
      lineStyle: {
        width: 3,
        color: avgLineColor,
        type: 'solid',
      },
      itemStyle: {
        color: avgLineColor,
      },
    })
  }

  const option: echarts.EChartsOption = {
    textStyle: {
      color: theme.textColor,
      fontFamily,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.tooltip.backgroundColor,
      borderColor: theme.tooltip.borderColor,
      textStyle: {
        color: theme.tooltip.textColor,
        fontFamily,
      },
      axisPointer: {
        type: 'cross',
        lineStyle: {
          color: theme.axisLineColor,
        },
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
    legend: props.chartType === 'bar' ? undefined : {
      data: [...dimensions.map(d => COGNITIVE_DIMENSIONS[d].name), '平均'],
      bottom: 0,
      type: 'scroll',
      textStyle: {
        fontSize: 12,
        color: theme.legend.textColor,
        fontFamily,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: props.chartType === 'bar' ? '10%' : '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: props.chartType === 'bar',
      data: xAxisData,
      axisLabel: {
        fontSize: 12,
        color: theme.textColorSecondary,
        fontFamily,
      },
      axisLine: {
        lineStyle: {
          color: theme.axisLineColor,
        },
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
        color: theme.textColorSecondary,
        fontFamily,
      },
      axisLine: {
        lineStyle: {
          color: theme.axisLineColor,
        },
      },
      splitLine: {
        lineStyle: {
          color: theme.splitLineColor,
        },
      },
    },
    series,
    // 添加警示區域標記
    ...(props.showWarningLines && props.chartType !== 'bar' ? {
      visualMap: {
        show: false,
        pieces: [
          { min: 0, max: 50, color: 'rgba(239, 68, 68, 0.1)' },   // 警戒區
          { min: 50, max: 70, color: 'rgba(251, 191, 36, 0.1)' }, // 注意區
          { min: 70, max: 100, color: 'rgba(34, 197, 94, 0.1)' }  // 正常區
        ],
        seriesIndex: [series.length - 1], // 只應用於平均線/柱
      }
    } : {}),
  }

  // 為平均線添加警示標線
  if (props.showWarningLines && series.length > 0) {
    const avgSeries = series[series.length - 1]
    if (!avgSeries) {
      chart.setOption(option, true)
      return
    }
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
    if (props.chartType !== 'bar' && props.history.length >= 3) {
      // 計算最近趨勢（最後3筆資料）
      const recentScores = averageScores.slice(-3)
      const firstRecent = recentScores[0]
      const lastRecent = recentScores[recentScores.length - 1]
      
      if (firstRecent && lastRecent) {
        const declineRate = ((firstRecent - lastRecent) / firstRecent) * 100
        const significantDecline = props.professionalMode ? 7 : 15  // 專業模式: 7%, 一般模式: 15%
        
        if (declineRate >= significantDecline && avgSeries) {
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
                name: 'decline',
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

// 監聽主題變化 - 使用 dispose + 重新初始化
watch(effectiveTheme, () => {
  initChart()
})

// 獲取圖表圖片
function getDataURL(): string | null {
  return chart?.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: effectiveTheme.value === 'dark' ? '#1f2937' : '#ffffff'
  }) || null
}

defineExpose({
  getDataURL
})

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

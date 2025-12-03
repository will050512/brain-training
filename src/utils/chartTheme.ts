/**
 * ECharts 圖表主題配置
 * 提供淺色與深色兩種主題
 */

export type ChartTheme = 'light' | 'dark'

// 淺色主題配置
export const lightChartTheme = {
  // 文字顏色
  textColor: '#333333',
  textColorSecondary: '#6b7280',
  
  // 軸線顏色
  axisLineColor: '#e2e8f0',
  splitLineColor: '#e2e8f0',
  
  // 背景
  backgroundColor: 'transparent',
  
  // 提示框
  tooltip: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    textColor: '#1f2937',
  },
  
  // 圖例
  legend: {
    textColor: '#374151',
  },
  
  // 雷達圖
  radar: {
    axisNameColor: '#333333',
    splitAreaColors: [
      'rgba(59, 130, 246, 0.05)',   // 優秀區（藍色）
      'rgba(34, 197, 94, 0.08)',     // 良好區（綠色）
      'rgba(251, 191, 36, 0.1)',     // 正常區（黃色）
      'rgba(239, 68, 68, 0.15)',     // 警戒區（紅色）
      'rgba(239, 68, 68, 0.2)',      // 危險區（深紅色）
    ],
  },
  
  // 參考線顏色
  referenceLine: {
    excellent: '#22c55e',
    good: '#fbbf24',
    warning: '#ef4444',
  },
}

// 深色主題配置
export const darkChartTheme = {
  // 文字顏色
  textColor: '#e2e8f0',
  textColorSecondary: '#94a3b8',
  
  // 軸線顏色
  axisLineColor: '#475569',
  splitLineColor: '#334155',
  
  // 背景
  backgroundColor: 'transparent',
  
  // 提示框
  tooltip: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
    textColor: '#f1f5f9',
  },
  
  // 圖例
  legend: {
    textColor: '#cbd5e1',
  },
  
  // 雷達圖
  radar: {
    axisNameColor: '#e2e8f0',
    splitAreaColors: [
      'rgba(96, 165, 250, 0.08)',    // 優秀區（藍色）
      'rgba(74, 222, 128, 0.1)',     // 良好區（綠色）
      'rgba(251, 191, 36, 0.12)',    // 正常區（黃色）
      'rgba(248, 113, 113, 0.15)',   // 警戒區（紅色）
      'rgba(248, 113, 113, 0.2)',    // 危險區（深紅色）
    ],
  },
  
  // 參考線顏色
  referenceLine: {
    excellent: '#4ade80',
    good: '#fde047',
    warning: '#f87171',
  },
}

/**
 * 根據主題類型取得對應的圖表主題配置
 */
export function getChartTheme(theme: ChartTheme) {
  return theme === 'dark' ? darkChartTheme : lightChartTheme
}

/**
 * 取得通用的 ECharts 選項配置
 */
export function getCommonChartOptions(theme: ChartTheme) {
  const chartTheme = getChartTheme(theme)
  
  return {
    textStyle: {
      color: chartTheme.textColor,
    },
    tooltip: {
      backgroundColor: chartTheme.tooltip.backgroundColor,
      borderColor: chartTheme.tooltip.borderColor,
      textStyle: {
        color: chartTheme.tooltip.textColor,
      },
    },
    legend: {
      textStyle: {
        color: chartTheme.legend.textColor,
      },
    },
  }
}

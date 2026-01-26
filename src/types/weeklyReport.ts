import type { CognitiveDimension, CognitiveScores } from '@/types/cognitive'

export type WeeklyReportTab = 'overview' | 'professional' | 'trend' | 'nutrition'

export type WeeklyReportActivityFilter = 'daily' | 'all'

export interface WeeklyReportTabItem {
  key: WeeklyReportTab
  label: string
  icon: string
}

export interface WeekStatsCard {
  icon: string
  value: string | number
  label: string
}

export interface TrendArrow {
  arrow: string
  class: string
  change: number
}

export interface DimensionItem {
  key: CognitiveDimension
  name: string
  icon: string
  score: number
  trend: TrendArrow
}

export type DailyActivityCounts = number[]
export type DailyActivityLabels = string[]

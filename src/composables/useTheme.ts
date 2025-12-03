/**
 * 主題切換 Composable
 * 支援淺色、深色與跟隨系統三種模式
 */

import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

export type ThemeMode = 'light' | 'dark' | 'system'
export type EffectiveTheme = 'light' | 'dark'

// 主題色配置
const THEME_COLORS = {
  light: '#667eea',
  dark: '#1e293b'
} as const

export function useTheme() {
  const settingsStore = useSettingsStore()
  
  // 取得系統偏好
  const getSystemPreference = (): EffectiveTheme => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  
  // 計算有效主題
  const effectiveTheme = computed<EffectiveTheme>(() => {
    if (settingsStore.themeMode === 'system') {
      return getSystemPreference()
    }
    return settingsStore.themeMode
  })
  
  // 是否為深色模式
  const isDark = computed(() => effectiveTheme.value === 'dark')
  
  // 更新 DOM 類別
  const updateDOMClass = (theme: EffectiveTheme) => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
  
  // 更新 meta theme-color 標籤
  const updateThemeColor = (theme: EffectiveTheme) => {
    const color = THEME_COLORS[theme]
    let metaTag = document.querySelector('meta[name="theme-color"]')
    
    if (!metaTag) {
      metaTag = document.createElement('meta')
      metaTag.setAttribute('name', 'theme-color')
      document.head.appendChild(metaTag)
    }
    
    metaTag.setAttribute('content', color)
  }
  
  // 應用主題
  const applyTheme = (theme: EffectiveTheme) => {
    updateDOMClass(theme)
    updateThemeColor(theme)
  }
  
  // 設定主題模式
  const setThemeMode = (mode: ThemeMode) => {
    settingsStore.setThemeMode(mode)
  }
  
  // 切換深淺色
  const toggleTheme = () => {
    const newTheme = effectiveTheme.value === 'dark' ? 'light' : 'dark'
    setThemeMode(newTheme)
  }
  
  // 監聽系統主題變化
  let mediaQuery: MediaQueryList | null = null
  
  const handleSystemThemeChange = (e: MediaQueryListEvent) => {
    if (settingsStore.themeMode === 'system') {
      applyTheme(e.matches ? 'dark' : 'light')
    }
  }
  
  // 初始化主題
  const initTheme = () => {
    // 立即應用主題，避免閃爍
    applyTheme(effectiveTheme.value)
    
    // 監聽系統主題變化
    if (typeof window !== 'undefined') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', handleSystemThemeChange)
    }
  }
  
  // 清理監聽器
  const cleanupTheme = () => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }
  
  // 監聽主題模式變化
  watch(
    () => settingsStore.themeMode,
    () => {
      applyTheme(effectiveTheme.value)
    },
    { immediate: true }
  )
  
  // 生命週期
  onMounted(() => {
    initTheme()
  })
  
  onUnmounted(() => {
    cleanupTheme()
  })
  
  return {
    // 狀態
    themeMode: computed(() => settingsStore.themeMode),
    effectiveTheme,
    isDark,
    
    // 動作
    setThemeMode,
    toggleTheme,
    initTheme,
    cleanupTheme
  }
}

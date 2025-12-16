/**
 * 響應式斷點偵測 Composable
 * 使用 matchMedia API 進行即時偵測
 */
import { ref, readonly, computed, onMounted, onUnmounted, watchEffect } from 'vue'

export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

interface BreakpointConfig {
  xs: number     // < 480px - 超小手機
  sm: number     // 480px - 639px - 小手機
  md: number     // 640px - 767px - 大手機/小平板
  lg: number     // 768px - 1023px - 平板
  xl: number     // 1024px - 1279px - 小桌面
  '2xl': number  // 1280px - 1535px - 桌面
  '3xl': number  // >= 1536px - 大桌面
}

const BREAKPOINTS: BreakpointConfig = {
  xs: 0,
  sm: 480,
  md: 640,
  lg: 768,
  xl: 1024,
  '2xl': 1280,
  '3xl': 1536,
}

// 全域狀態（單例）
const isXs = ref(false)
const isSm = ref(false)
const isMd = ref(false)
const isLg = ref(false)
const isXl = ref(false)
const is2xl = ref(false)
const is3xl = ref(false)
const currentBreakpoint = ref<BreakpointKey>('xs')
const screenWidth = ref(0)
const screenHeight = ref(0)
const isLandscape = ref(false)
const isTouchDevice = ref(false)

let initialized = false
let mediaQueryListeners: Array<{ mql: MediaQueryList; handler: () => void }> = []

/**
 * 初始化響應式偵測
 */
function initResponsive(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  // 偵測觸控裝置
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // 建立 MediaQueryList - 新的7斷點系統
  const mqlXs = window.matchMedia(`(max-width: ${BREAKPOINTS.sm - 1}px)`)
  const mqlSm = window.matchMedia(`(min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.md - 1}px)`)
  const mqlMd = window.matchMedia(`(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`)
  const mqlLg = window.matchMedia(`(min-width: ${BREAKPOINTS.lg}px) and (max-width: ${BREAKPOINTS.xl - 1}px)`)
  const mqlXl = window.matchMedia(`(min-width: ${BREAKPOINTS.xl}px) and (max-width: ${BREAKPOINTS['2xl'] - 1}px)`)
  const mql2xl = window.matchMedia(`(min-width: ${BREAKPOINTS['2xl']}px) and (max-width: ${BREAKPOINTS['3xl'] - 1}px)`)
  const mql3xl = window.matchMedia(`(min-width: ${BREAKPOINTS['3xl']}px)`)
  const mqlLandscape = window.matchMedia('(orientation: landscape)')

  // 更新狀態函數
  const updateBreakpoints = (): void => {
    isXs.value = mqlXs.matches
    isSm.value = mqlSm.matches
    isMd.value = mqlMd.matches
    isLg.value = mqlLg.matches
    isXl.value = mqlXl.matches
    is2xl.value = mql2xl.matches
    is3xl.value = mql3xl.matches
    isLandscape.value = mqlLandscape.matches
    screenWidth.value = window.innerWidth
    screenHeight.value = window.innerHeight

    // 決定當前斷點 - 按優先級順序
    if (mql3xl.matches) {
      currentBreakpoint.value = '3xl'
    } else if (mql2xl.matches) {
      currentBreakpoint.value = '2xl'
    } else if (mqlXl.matches) {
      currentBreakpoint.value = 'xl'
    } else if (mqlLg.matches) {
      currentBreakpoint.value = 'lg'
    } else if (mqlMd.matches) {
      currentBreakpoint.value = 'md'
    } else if (mqlSm.matches) {
      currentBreakpoint.value = 'sm'
    } else {
      currentBreakpoint.value = 'xs'
    }
  }

  // 初始更新
  updateBreakpoints()

  // 監聽變化
  const addListener = (mql: MediaQueryList): void => {
    const handler = (): void => updateBreakpoints()
    if (mql.addEventListener) {
      mql.addEventListener('change', handler)
    } else {
      // 舊版瀏覽器支援
      mql.addListener(handler)
    }
    mediaQueryListeners.push({ mql, handler })
  }

  addListener(mqlXs)
  addListener(mqlSm)
  addListener(mqlMd)
  addListener(mqlLg)
  addListener(mqlXl)
  addListener(mql2xl)
  addListener(mql3xl)
  addListener(mqlLandscape)

  // 監聽 resize 以更新精確尺寸
  window.addEventListener('resize', updateBreakpoints)
}

/**
 * 清理監聽器
 */
function cleanupResponsive(): void {
  mediaQueryListeners.forEach(({ mql, handler }) => {
    if (mql.removeEventListener) {
      mql.removeEventListener('change', handler)
    } else {
      mql.removeListener(handler)
    }
  })
  mediaQueryListeners = []
  initialized = false
}

/**
 * 響應式 Composable
 */
export function useResponsive() {
  onMounted(() => {
    initResponsive()
  })

  return {
    // 狀態
    isXs: readonly(isXs),
    isSm: readonly(isSm),
    isMd: readonly(isMd),
    isLg: readonly(isLg),
    isXl: readonly(isXl),
    is2xl: readonly(is2xl),
    is3xl: readonly(is3xl),
    currentBreakpoint: readonly(currentBreakpoint),
    screenWidth: readonly(screenWidth),
    screenHeight: readonly(screenHeight),
    isLandscape: readonly(isLandscape),
    isTouchDevice: readonly(isTouchDevice),

    // 兼容性屬性
    isMobile: readonly(computed(() => isXs.value || isSm.value || isMd.value)),
    isTablet: readonly(computed(() => isLg.value)),
    isDesktop: readonly(computed(() => isXl.value || is2xl.value || is3xl.value)),

    // 常數
    BREAKPOINTS,

    // 工具函數
    /** 是否為行動裝置（手機或平板） */
    isMobileOrTablet: () => isXs.value || isSm.value || isMd.value || isLg.value,
    /** 是否為桌面或更大 */
    isDesktopOrWider: () => isXl.value || is2xl.value || is3xl.value,
    /** 是否為小螢幕橫向模式 */
    isSmallLandscape: () => isLandscape.value && screenHeight.value < 500,
    /** 是否為超小螢幕 */
    isExtraSmall: () => isXs.value,
    /** 是否為中等螢幕以上 */
    isMediumOrLarger: () => isMd.value || isLg.value || isXl.value || is2xl.value || is3xl.value,
  }
}

/**
 * 建立自訂媒體查詢 hook
 */
export function useMediaQuery(query: string) {
  const matches = ref(false)

  onMounted(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia(query)
    matches.value = mql.matches

    const handler = (e: MediaQueryListEvent): void => {
      matches.value = e.matches
    }

    if (mql.addEventListener) {
      mql.addEventListener('change', handler)
    } else {
      mql.addListener(handler)
    }

    onUnmounted(() => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handler)
      } else {
        mql.removeListener(handler)
      }
    })
  })

  return readonly(matches)
}

export { BREAKPOINTS }

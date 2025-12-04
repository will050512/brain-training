/**
 * 響應式斷點偵測 Composable
 * 使用 matchMedia API 進行即時偵測
 */
import { ref, readonly, onMounted, onUnmounted, watchEffect } from 'vue'

export type BreakpointKey = 'mobile' | 'tablet' | 'desktop' | 'wide'

interface BreakpointConfig {
  mobile: number   // < 768px
  tablet: number   // 768px - 1024px
  desktop: number  // 1024px - 1400px
  wide: number     // >= 1400px
}

const BREAKPOINTS: BreakpointConfig = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1400,
}

// 全域狀態（單例）
const isMobile = ref(false)
const isTablet = ref(false)
const isDesktop = ref(false)
const isWide = ref(false)
const currentBreakpoint = ref<BreakpointKey>('mobile')
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

  // 建立 MediaQueryList
  const mqlMobile = window.matchMedia(`(max-width: ${BREAKPOINTS.tablet - 1}px)`)
  const mqlTablet = window.matchMedia(`(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`)
  const mqlDesktop = window.matchMedia(`(min-width: ${BREAKPOINTS.desktop}px) and (max-width: ${BREAKPOINTS.wide - 1}px)`)
  const mqlWide = window.matchMedia(`(min-width: ${BREAKPOINTS.wide}px)`)
  const mqlLandscape = window.matchMedia('(orientation: landscape)')

  // 更新狀態函數
  const updateBreakpoints = (): void => {
    isMobile.value = mqlMobile.matches
    isTablet.value = mqlTablet.matches
    isDesktop.value = mqlDesktop.matches || mqlWide.matches
    isWide.value = mqlWide.matches
    isLandscape.value = mqlLandscape.matches
    screenWidth.value = window.innerWidth
    screenHeight.value = window.innerHeight

    // 決定當前斷點
    if (mqlWide.matches) {
      currentBreakpoint.value = 'wide'
    } else if (mqlDesktop.matches) {
      currentBreakpoint.value = 'desktop'
    } else if (mqlTablet.matches) {
      currentBreakpoint.value = 'tablet'
    } else {
      currentBreakpoint.value = 'mobile'
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

  addListener(mqlMobile)
  addListener(mqlTablet)
  addListener(mqlDesktop)
  addListener(mqlWide)
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
    isMobile: readonly(isMobile),
    isTablet: readonly(isTablet),
    isDesktop: readonly(isDesktop),
    isWide: readonly(isWide),
    currentBreakpoint: readonly(currentBreakpoint),
    screenWidth: readonly(screenWidth),
    screenHeight: readonly(screenHeight),
    isLandscape: readonly(isLandscape),
    isTouchDevice: readonly(isTouchDevice),

    // 常數
    BREAKPOINTS,

    // 工具函數
    /** 是否為行動裝置（手機或平板） */
    isMobileOrTablet: () => isMobile.value || isTablet.value,
    /** 是否為桌面或更大 */
    isDesktopOrWider: () => isDesktop.value || isWide.value,
    /** 是否為小螢幕橫向模式 */
    isSmallLandscape: () => isLandscape.value && screenHeight.value < 500,
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

/**
 * 佈局類型定義
 */

/**
 * 佈局類型
 * - default: 預設佈局（根據裝置自動選擇）
 * - app: 手機 APP 風格（AppShell）
 * - desktop: 桌面專業版（DesktopLayout）
 * - game: 遊戲專用全螢幕（GameContainer）
 * - fullscreen: 純全螢幕（無導航）
 */
export type LayoutType = 'default' | 'app' | 'desktop' | 'game' | 'fullscreen'

/**
 * 佈局配置
 */
export interface LayoutConfig {
  /** 佈局類型 */
  type: LayoutType
  /** 是否顯示頭部 */
  showHeader?: boolean
  /** 是否顯示底部 */
  showFooter?: boolean
  /** 是否顯示側邊欄 */
  showSidebar?: boolean
  /** 頭部標題 */
  headerTitle?: string
  /** 是否顯示返回按鈕 */
  showBack?: boolean
  /** 返回路徑 */
  backPath?: string
}

/**
 * 擴展 vue-router 的 RouteMeta
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 佈局類型 */
    layout?: LayoutType
    /** 頁面標題 */
    title?: string
    /** 是否需要登入 */
    requiresAuth?: boolean
    /** 是否需要完成評估 */
    requiresAssessment?: boolean
    /** 頁面過渡動畫 */
    transition?: string
    /** 是否為遊戲頁面 */
    isGame?: boolean
    /** 是否隱藏底部導航 */
    hideBottomNav?: boolean
  }
}

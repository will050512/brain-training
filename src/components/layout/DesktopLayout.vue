<script setup lang="ts">
/**
 * 通用佈局元件 (Responsive Layout)
 * 優化重點：
 * 1. 桌面端採用 App-Shell 模式：側邊欄與 Header 固定，僅內容區捲動。
 * 2. 側邊欄懸停/收合邏輯優化。
 * 3. 手機端維持抽屜式導航。
 */
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useResponsive } from '@/composables/useResponsive'
import SyncStatusIndicator from '@/components/ui/SyncStatusIndicator.vue'

interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  badge?: number | string
}

interface Props {
  appName?: string
  appIcon?: string
  navItems?: NavItem[]
  showAside?: boolean
  defaultCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  appName: '愛護腦',
  appIcon: '🧠',
  navItems: () => [
    { id: 'home', label: '首頁', icon: '🏠', path: '/' },
    { id: 'games', label: '遊戲訓練', icon: '🎮', path: '/games' },
    { id: 'daily', label: '每日挑戰', icon: '🎯', path: '/daily-challenge' },
    { id: 'report', label: '訓練報告', icon: '📊', path: '/report' },
    { id: 'nutrition', label: '營養建議', icon: '🥗', path: '/nutrition' },
    { id: 'settings', label: '設定', icon: '⚙️', path: '/settings' },
  ],
  showAside: false,
  defaultCollapsed: false,
})

const emit = defineEmits<{
  (e: 'update:collapsed', value: boolean): void
}>()

const router = useRouter()
const route = useRoute()
const { isMobile, isTablet } = useResponsive()

// 狀態管理
const isSidebarOpen = ref(false) // 手機版：是否開啟抽屜
const isCollapsed = ref(props.defaultCollapsed) // 桌面版：是否收合
const isHovering = ref(false) // 桌面版：滑鼠懸停

// 監聽螢幕尺寸變化
watch(isMobile, (mobile) => {
  if (mobile) {
    isSidebarOpen.value = false
  } else {
    isSidebarOpen.value = true
  }
}, { immediate: true })

// 平板自動收合
watch(isTablet, (tablet) => {
  if (tablet && !isMobile.value) {
    isCollapsed.value = true
  }
})

// 計算屬性
const showSidebarText = computed(() => {
  if (isMobile.value) return true
  return !isCollapsed.value || isHovering.value
})

const isActiveRoute = (path: string): boolean => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const navigateTo = (path: string): void => {
  router.push(path)
  if (isMobile.value) isSidebarOpen.value = false
}

const toggleMobileMenu = () => isSidebarOpen.value = !isSidebarOpen.value

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  emit('update:collapsed', isCollapsed.value)
}
</script>

<template>
  <div class="layout-container">
    
    <Transition name="fade">
      <div 
        v-if="isMobile && isSidebarOpen" 
        class="mobile-overlay"
        @click="isSidebarOpen = false"
      ></div>
    </Transition>

    <header v-if="isMobile" class="mobile-header">
      <button @click="toggleMobileMenu" class="mobile-menu-btn">
        <span class="text-xl">☰</span>
      </button>
      <div class="flex items-center gap-2">
        <img src="@/assets/logo.svg" alt="logo" class="w-6 h-6" />
        <span class="font-bold text-lg">{{ appName }}</span>
      </div>
      <div class="w-8"></div> 
    </header>

    <aside 
      class="sidebar"
      :class="{ 
        'sidebar-mobile': isMobile,
        'sidebar-mobile-open': isMobile && isSidebarOpen,
        'sidebar-desktop-collapsed': !isMobile && isCollapsed && !isHovering,
        'sidebar-desktop-expanded': !isMobile && (!isCollapsed || isHovering)
      }"
      @mouseenter="!isMobile && (isHovering = true)"
      @mouseleave="!isMobile && (isHovering = false)"
    >
      <div class="sidebar-header">
        <div class="app-info" :class="{ 'justify-center': !showSidebarText && !isMobile }">
          <img src="@/assets/logo.svg" alt="Logo" class="app-logo" />
          <Transition name="fade-slide">
            <span v-if="showSidebarText" class="app-name">{{ appName }}</span>
          </Transition>
        </div>
        
        <button 
          v-if="!isMobile"
          class="collapse-toggle"
          :class="{ 'opacity-0': !showSidebarText }"
          @click.stop="toggleCollapse"
        >
          <span class="arrow-icon" :class="{ 'rotate-180': !isCollapsed }">›</span>
        </button>

        <button v-if="isMobile" @click="isSidebarOpen = false" class="mobile-close-btn">
          ✕
        </button>
      </div>

      <nav class="sidebar-nav custom-scrollbar">
        <ul class="nav-list">
          <li v-for="item in navItems" :key="item.id">
            <button
              class="nav-item"
              :class="{ 
                'active': isActiveRoute(item.path),
                'collapsed-mode': !showSidebarText && !isMobile
              }"
              @click="navigateTo(item.path)"
              :title="!showSidebarText ? item.label : ''"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              
              <Transition name="fade-slide">
                <div v-if="showSidebarText" class="nav-content">
                  <span class="nav-label">{{ item.label }}</span>
                  <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
                </div>
              </Transition>
            </button>
          </li>
        </ul>
      </nav>

      <div class="sidebar-footer">
        <div class="footer-content" :class="{ 'justify-center': !showSidebarText }">
          <SyncStatusIndicator :position="showSidebarText ? 'sidebar' : 'icon'" />
        </div>
        <slot name="sidebar-footer" :collapsed="!showSidebarText" />
      </div>
    </aside>

    <div class="main-wrapper">
      <header v-if="$slots.header && !isMobile" class="desktop-header">
        <slot name="header" />
      </header>

      <main class="main-content custom-scrollbar">
        <slot />
      </main>
    </div>

    <aside 
      v-if="(showAside || $slots.aside) && !isMobile" 
      class="aside-panel custom-scrollbar"
    >
      <slot name="aside" />
    </aside>
  </div>
</template>

<style scoped>
/* ===== 核心佈局修正 ===== */
.layout-container {
  display: flex;
  /* 關鍵：強制容器高度等於視窗高度，禁止外層捲動 */
  height: 100vh;
  height: 100dvh;
  width: 100vw;
  width: 100dvw;
  background-color: var(--color-bg);
  position: relative;
  overflow: hidden; /* 防止 Body 捲動 */
  /* 確保最小高度 */
  min-height: 100vh;
  min-height: 100dvh;
}

/* ===== 主內容區 ===== */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%; /* 繼承父層高度 */
  position: relative;
  /* 手機版為了避開 Fixed Header 的 padding */
  padding-top: 56px; 
}

@media (min-width: 768px) {
  .main-wrapper {
    padding-top: 0;
  }
}

/* 桌面 Header 樣式 - 不再使用 sticky，因為它在 flex col 中自然位於頂部 */
.desktop-header {
  flex-shrink: 0; /* 防止被擠壓 */
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  z-index: 20;
}

/* 內容捲動區 - 這是真正發生捲動的地方 */
.main-content {
  flex: 1;
  overflow-y: auto; /* 啟用垂直捲動 */
  overflow-x: hidden;
  padding: 1rem;
  scroll-behavior: smooth;
}

@media (min-width: 1024px) {
  .main-content {
    padding: 2rem;
  }
}

/* ===== 側邊欄通用 ===== */
.sidebar {
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 50;
  flex-shrink: 0;
  height: 100%; /* 佔滿高度 */
}

/* 導航列表區域 (側邊欄內部的捲動) */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0.75rem;
}

/* 右側資訊欄 */
.aside-panel {
  width: 300px;
  border-left: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
  padding: 1.5rem;
  overflow-y: auto; /* 獨立捲動 */
  height: 100%;
}

/* ===== 手機版樣式 ===== */
.mobile-header {
  position: absolute; /* 改為 absolute，相對於 layout-container */
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  z-index: 60; /* 最高層級 */
}

.mobile-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 45;
}

/* 手機版 Sidebar (Drawer) */
.sidebar-mobile {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  height: 100%;
  width: 280px;
  transform: translateX(-100%);
  box-shadow: none;
}

.sidebar-mobile-open {
  transform: translateX(0);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
}

/* 桌面版 Sidebar 寬度 */
.sidebar-desktop-collapsed { width: 72px; }
.sidebar-desktop-expanded { width: 260px; }

/* 懸停展開效果 */
.layout-container:has(.sidebar-desktop-collapsed:hover) .sidebar-desktop-collapsed {
  width: 260px;
  position: absolute; /* 懸停時脫離流，覆蓋內容 */
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
  height: 100%;
}

/* ===== 元件細節樣式 ===== */
.sidebar-header {
  height: 64px;
  flex-shrink: 0; /* 防止被擠壓 */
  display: flex;
  align-items: center;
  padding: 0 1.25rem;
  border-bottom: 1px solid var(--color-border-light);
}

.sidebar-footer {
  flex-shrink: 0;
  padding: 1rem;
  border-top: 1px solid var(--color-border-light);
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  color: var(--color-text-secondary);
  transition: all 0.2s;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.nav-item:hover {
  background-color: var(--color-bg-soft);
  color: var(--color-text);
}

.nav-item.active {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 600;
}

.nav-item.collapsed-mode {
  justify-content: center;
  padding: 0.75rem 0;
}

.nav-icon {
  font-size: 1.25rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-content {
  margin-left: 0.75rem;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  white-space: nowrap;
  overflow: hidden;
}

.nav-badge {
  background: var(--color-primary);
  color: white;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 99px;
  min-width: 1.25rem;
  text-align: center;
}

.app-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  overflow: hidden;
}

.app-logo { width: 32px; height: 32px; flex-shrink: 0; }
.app-name { font-weight: 700; font-size: 1.125rem; white-space: nowrap; color: var(--color-text); }

.collapse-toggle {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border-radius: 4px; color: var(--color-text-secondary); background: var(--color-bg-soft); transition: all 0.2s;
}
.collapse-toggle:hover { background: var(--color-bg-muted); color: var(--color-text); }
.arrow-icon { font-size: 1.25rem; line-height: 1; font-weight: bold; transition: transform 0.3s; }
.mobile-menu-btn { padding: 0.5rem; margin-left: -0.5rem; color: var(--color-text); }
.mobile-close-btn { margin-left: auto; padding: 8px; font-size: 1.25rem; color: var(--color-text-secondary); }

/* ===== 美化捲軸 (Chrome/Safari/Edge) ===== */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-text-muted);
}

/* ===== 過渡動畫 ===== */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateX(-10px); }
</style>

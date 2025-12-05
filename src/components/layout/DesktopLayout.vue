<script setup lang="ts">
/**
 * 桌面版布局元件
 * 可收合側邊欄 + 主內容區 + 可選資訊側欄
 */
import { ref, computed, watch, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useResponsive } from '@/composables/useResponsive'

interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  badge?: number | string
}

interface Props {
  /** 應用名稱 */
  appName?: string
  /** 應用圖示 */
  appIcon?: string
  /** 導航項目 */
  navItems?: NavItem[]
  /** 是否顯示右側資訊欄 */
  showAside?: boolean
  /** 側邊欄預設收合狀態 */
  defaultCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  appName: '愛健腦',
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
const { isTablet } = useResponsive()

// 側邊欄狀態
const isCollapsed = ref(props.defaultCollapsed)
const isHovering = ref(false)

// 平板模式下預設收合
watch(isTablet, (val) => {
  if (val) {
    isCollapsed.value = true
  }
}, { immediate: true })

// 當收合狀態改變時通知父元件
watch(isCollapsed, (val) => {
  emit('update:collapsed', val)
})

// 實際顯示狀態（hover 時展開）
const showExpanded = computed(() => !isCollapsed.value || isHovering.value)

// 當前路由匹配
const isActiveRoute = (path: string): boolean => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// 切換收合
const toggleCollapse = (): void => {
  isCollapsed.value = !isCollapsed.value
}

// 導航
const navigateTo = (path: string): void => {
  router.push(path)
}

// Provide 給子元件使用
provide('desktopLayout', {
  isCollapsed,
  toggleCollapse,
})
</script>

<template>
  <div class="desktop-layout">
    <!-- 側邊導航欄 -->
    <aside 
      class="sidebar"
      :class="{ 
        'sidebar-collapsed': isCollapsed && !isHovering,
        'sidebar-hovering': isHovering 
      }"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
    >
      <!-- Logo 區域 -->
      <div class="sidebar-header">
        <div class="app-logo">
          <img 
            src="/logo.svg" 
            alt="愛健腦" 
            class="app-logo-img"
          />
          <Transition name="fade">
            <span v-if="showExpanded" class="app-logo-text">{{ appName }}</span>
          </Transition>
        </div>
        
        <!-- 收合按鈕 -->
        <button 
          type="button"
          class="collapse-btn"
          :class="{ 'collapse-btn-visible': showExpanded }"
          @click="toggleCollapse"
          :title="isCollapsed ? '展開側邊欄' : '收合側邊欄'"
        >
          <span class="collapse-icon" :class="{ 'rotated': !isCollapsed }">
            ‹
          </span>
        </button>
      </div>

      <!-- 導航列表 -->
      <nav class="sidebar-nav">
        <ul class="nav-list">
          <li v-for="item in navItems" :key="item.id">
            <button
              type="button"
              class="nav-item"
              :class="{ 'nav-item-active': isActiveRoute(item.path) }"
              @click="navigateTo(item.path)"
              :title="isCollapsed && !isHovering ? item.label : undefined"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <Transition name="fade">
                <span v-if="showExpanded" class="nav-label">{{ item.label }}</span>
              </Transition>
              <span 
                v-if="item.badge && showExpanded" 
                class="nav-badge"
              >
                {{ item.badge }}
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- 底部區域 -->
      <div class="sidebar-footer">
        <slot name="sidebar-footer" :collapsed="isCollapsed && !isHovering" />
      </div>
    </aside>

    <!-- 主內容區 -->
    <div class="main-wrapper">
      <!-- 頂部欄（可選） -->
      <header v-if="$slots.header" class="main-header">
        <slot name="header" />
      </header>

      <!-- 主內容 -->
      <main class="main-content">
        <slot />
      </main>
    </div>

    <!-- 右側資訊欄（可選） -->
    <aside v-if="showAside || $slots.aside" class="aside-panel">
      <slot name="aside" />
    </aside>
  </div>
</template>

<style scoped>
.desktop-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);
}

/* ===== 側邊欄 ===== */
.sidebar {
  display: flex;
  flex-direction: column;
  width: 260px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  transition: width var(--transition-normal);
  position: relative;
  z-index: 20;
}

.sidebar-collapsed {
  width: 72px;
}

.sidebar-hovering {
  position: absolute;
  height: 100%;
  box-shadow: var(--shadow-xl);
}

/* Logo */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border-light);
  min-height: 64px;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  overflow: hidden;
}

.app-logo-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
}

.app-logo-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.app-logo-text {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
}

/* 收合按鈕 */
.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.collapse-btn-visible {
  opacity: 1;
}

.sidebar:hover .collapse-btn {
  opacity: 1;
}

.collapse-btn:hover {
  background: var(--color-bg-muted);
}

.collapse-icon {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--color-text-muted);
  transition: transform var(--transition-fast);
}

.collapse-icon.rotated {
  transform: rotate(180deg);
}

/* 導航 */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: transparent;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
  font-weight: 500;
  overflow: hidden;
}

.nav-item:hover {
  background: var(--color-bg-soft);
  color: var(--color-text);
}

.nav-item-active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 600;
}

.nav-item-active:hover {
  background: var(--color-primary-bg);
}

.nav-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-badge {
  margin-left: auto;
  padding: 2px 8px;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

/* 側邊欄底部 */
.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);
}

/* ===== 主內容區 ===== */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* 防止 flex 子項溢出 */
  transition: margin-left var(--transition-normal);
}

.sidebar-hovering ~ .main-wrapper {
  margin-left: 72px;
}

.main-header {
  flex-shrink: 0;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

/* ===== 右側資訊欄 ===== */
.aside-panel {
  width: 320px;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  padding: var(--spacing-lg);
}

/* ===== 動畫 ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== 響應式 ===== */
@media (max-width: 1200px) {
  .aside-panel {
    display: none;
  }
}

@media (max-width: 1024px) {
  .sidebar {
    width: 72px;
  }
  
  .sidebar:hover {
    width: 260px;
    position: absolute;
    height: 100%;
    box-shadow: var(--shadow-xl);
  }
}
</style>

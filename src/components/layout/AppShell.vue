<script setup lang="ts">
/**
 * APP Shell 元件
 * 手機版 APP 風格外殼，含頂部導航、可滾動內容區、底部操作區
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import SyncStatusIndicator from '@/components/ui/SyncStatusIndicator.vue'

interface Props {
  /** 頁面標題 */
  title?: string
  /** 是否顯示返回按鈕 */
  showBack?: boolean
  /** 返回路徑（預設為上一頁） */
  backPath?: string
  /** 是否顯示底部導航 */
  showFooter?: boolean
  /** 內容區是否可滾動 */
  scrollable?: boolean
  /** 是否使用安全區域 padding */
  safeArea?: boolean
  /** 頭部背景樣式 */
  headerVariant?: 'default' | 'transparent' | 'primary'
  /** 是否有底部導航列（預留空間） */
  hasBottomNav?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBack: false,
  showFooter: false,
  scrollable: true,
  safeArea: true,
  headerVariant: 'default',
  hasBottomNav: false,
})

const emit = defineEmits<{
  (e: 'back'): void
}>()

const router = useRouter()

const handleBack = (): void => {
  emit('back')
  if (props.backPath) {
    router.push(props.backPath)
  } else {
    router.back()
  }
}

const headerClass = computed(() => {
  const classes = ['app-shell-header']
  
  switch (props.headerVariant) {
    case 'transparent':
      classes.push('header-transparent')
      break
    case 'primary':
      classes.push('header-primary')
      break
    default:
      classes.push('header-default')
  }
  
  return classes
})
</script>

<template>
  <div 
    class="app-shell"
    :class="{ 
      'with-safe-area': safeArea,
      'has-bottom-nav': hasBottomNav
    }"
  >
    <!-- 頭部 -->
    <header :class="headerClass">
      <!-- 左側操作區 -->
      <div class="header-left">
        <button
          v-if="showBack"
          type="button"
          class="back-button"
          @click="handleBack"
        >
          <span class="back-icon">←</span>
          <span class="sr-only">返回</span>
        </button>
        <slot name="header-left" />
      </div>

      <!-- 標題區 -->
      <div class="header-center">
        <slot name="header-title">
          <div class="header-title-wrapper">
            <img 
              src="@/assets/logo.svg" 
              alt="愛護腦" 
              class="header-logo"
            />
            <h1 v-if="title" class="header-title">{{ title }}</h1>
          </div>
        </slot>
      </div>

      <!-- 右側操作區 -->
      <div class="header-right">
        <SyncStatusIndicator position="header" />
        <slot name="header-right" />
      </div>
    </header>

    <!-- 主內容區 -->
    <main 
      class="app-shell-content"
      :class="{ 'content-scroll': scrollable, 'content-fit': !scrollable }"
    >
      <slot />
    </main>

    <!-- 底部區 -->
    <footer v-if="showFooter || $slots.footer" class="app-shell-footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  min-height: 100svh;
  overflow: hidden;
  background: var(--color-bg);
  /* 確保在所有裝置上都填滿視窗 */
  min-height: 100vh;
  min-height: 100dvh;
  transition: background-color 0.3s ease;
}

.with-safe-area {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 有底部導航列時，預留底部空間 */
.has-bottom-nav {
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
}

.has-bottom-nav.with-safe-area {
  /* 覆蓋 with-safe-area 的 padding-bottom */
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
}

/* 頭部 */
.app-shell-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 60px; /* Larger touch target */
  padding: 0 var(--spacing-lg);
  gap: var(--spacing-md);
  z-index: 10;
  transition: all 0.3s ease;
}

.header-default {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-xs);
}

.header-transparent {
  background: transparent;
  border-bottom: none;
}

.header-primary {
  background: var(--gradient-primary);
  border-bottom: none;
  color: white;
  box-shadow: var(--shadow-md);
}

.header-primary .header-title {
  color: white;
}

.header-primary .back-button {
  color: white;
  border-color: var(--color-border-inverse);
}

.header-left,
.header-right {
  flex-shrink: 0;
  min-width: 48px;
  display: flex;
  align-items: center;
}

.header-right {
  justify-content: flex-end;
}

.header-center {
  flex: 1;
  text-align: center;
  overflow: hidden;
}

.header-title-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.header-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.header-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.025em;
}

/* 返回按鈕 */
.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  color: var(--color-text);
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.back-button:hover {
  background: var(--color-bg-soft);
  transform: translateX(-2px);
}

.back-button:active {
  background: var(--color-bg-muted);
  transform: translateX(0);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 內容區 */
.app-shell-content {
  flex: 1;
  overflow: hidden;
  background: var(--color-bg);
}

.content-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-padding-top: calc(var(--spacing-lg) + env(safe-area-inset-top));
  touch-action: pan-y;
}
.content-scroll::-webkit-scrollbar {
  display: none;
}

.content-fit {
  display: flex;
  flex-direction: column;
}

/* 底部區 */
.app-shell-footer {
  flex-shrink: 0;
  padding: var(--spacing-md);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  box-shadow: var(--shadow-top);
}

/* 橫向模式優化 */
@media (orientation: landscape) and (max-height: 500px) {
  .app-shell-header {
    min-height: 48px;
    padding: 0 var(--spacing-md);
  }
  
  .app-shell-footer {
    padding: var(--spacing-sm) var(--spacing-md);
  }
}

</style>

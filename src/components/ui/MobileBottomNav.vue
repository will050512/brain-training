<script setup lang="ts">
/**
 * 手機版底部導航列
 * PWA APP 風格的底部 Tab 導航
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

interface NavItem {
  path: string
  icon: string
  activeIcon: string
  label: string
  matchPaths?: string[]
}

const navItems: NavItem[] = [
  { 
    path: '/', 
    icon: '🏠', 
    activeIcon: '🏠', 
    label: '首頁',
    matchPaths: ['/']
  },
  { 
    path: '/games', 
    icon: '🎮', 
    activeIcon: '🎮', 
    label: '遊戲',
    matchPaths: ['/games', '/games/']
  },
  { 
    path: '/daily-challenge', 
    icon: '📅', 
    activeIcon: '📅', 
    label: '訓練',
    matchPaths: ['/daily-challenge', '/daily']
  },
  { 
    path: '/report', 
    icon: '📊', 
    activeIcon: '📊', 
    label: '報告',
    matchPaths: ['/report', '/weekly-report']
  },
  { 
    path: '/settings', 
    icon: '⚙️', 
    activeIcon: '⚙️', 
    label: '設定',
    matchPaths: ['/settings']
  },
]

// 判斷是否為當前路由
function isActive(item: NavItem): boolean {
  const currentPath = route.path
  if (item.matchPaths) {
    return item.matchPaths.some(p => currentPath === p || currentPath.startsWith(p + '/'))
  }
  return currentPath === item.path
}

// 不顯示底部導航的頁面
const hiddenPages = ['/login', '/onboarding', '/assessment']
const shouldHide = computed(() => {
  const matchedHide = route.matched.some(r => r.meta.hideBottomNav === true)
  return hiddenPages.some(p => route.path.startsWith(p)) ||
         matchedHide
})
</script>

<template>
  <Transition name="slide-up">
    <nav v-if="!shouldHide" class="mobile-bottom-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item) }"
      >
        <span class="nav-icon">{{ isActive(item) ? item.activeIcon : item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>
  </Transition>
</template>

<style scoped>
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 64px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom, 0);
  z-index: 1000;
  box-shadow: var(--shadow-top);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  padding: 8px 0;
  text-decoration: none;
  color: var(--color-text-muted);
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.nav-item.active {
  color: var(--color-primary);
}

.nav-icon {
  font-size: 1.6rem;
  line-height: 1;
  margin-bottom: 4px;
  transition: transform 0.2s ease;
}

.nav-item.active .nav-icon {
  transform: scale(1.1);
}

.nav-label {
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
}

/* 點擊效果 */
.nav-item:active {
  opacity: 0.7;
}

.nav-item:active .nav-icon {
  transform: scale(0.95);
}

.nav-item.active:active .nav-icon {
  transform: scale(1.05);
}

/* 動畫 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* 橫屏優化 */
@media (orientation: landscape) and (max-height: 500px) {
  .mobile-bottom-nav {
    height: 56px;
  }

  .nav-icon {
    font-size: 1.25rem;
  }

  .nav-label {
    font-size: 0.5625rem;
  }
}
</style>

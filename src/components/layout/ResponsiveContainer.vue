<script setup lang="ts">
/**
 * 響應式容器元件
 * 根據螢幕尺寸自動切換手機/桌面布局
 */
import { useResponsive } from '@/composables/useResponsive'

const { isMobile, isTablet, isDesktop, currentBreakpoint, isTouchDevice } = useResponsive()
</script>

<template>
  <div 
    class="responsive-container"
    :class="[
      `breakpoint-${currentBreakpoint}`,
      { 'is-touch': isTouchDevice }
    ]"
  >
    <!-- 手機版布局 -->
    <slot v-if="isMobile" name="mobile">
      <slot />
    </slot>
    
    <!-- 平板版布局（預設跟隨桌面） -->
    <slot v-else-if="isTablet" name="tablet">
      <slot name="desktop">
        <slot />
      </slot>
    </slot>
    
    <!-- 桌面版布局 -->
    <slot v-else name="desktop">
      <slot />
    </slot>
  </div>
</template>

<style scoped>
.responsive-container {
  min-height: 100%;
  width: 100%;
}
</style>

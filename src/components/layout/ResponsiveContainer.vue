<script setup lang="ts">
/**
 * 響應式容器元件
 * 根據螢幕尺寸自動切換手機/桌面布局
 * 使用新的7斷點流體設計系統
 */
import { useResponsive } from '@/composables/useResponsive'

const {
  isXs,
  isSm,
  isMd,
  isLg,
  isXl,
  is2xl,
  is3xl,
  currentBreakpoint,
  isTouchDevice,
  isMobileOrTablet,
  isDesktopOrWider
} = useResponsive()
</script>

<template>
  <div
    class="responsive-container"
    :class="[
      `breakpoint-${currentBreakpoint}`,
      { 'is-touch': isTouchDevice }
    ]"
  >
    <!-- 超小手機版布局 -->
    <slot v-if="isXs" name="xs">
      <slot name="mobile">
        <slot />
      </slot>
    </slot>

    <!-- 小手機版布局 -->
    <slot v-else-if="isSm" name="sm">
      <slot name="mobile">
        <slot />
      </slot>
    </slot>

    <!-- 大手機/小平板版布局 -->
    <slot v-else-if="isMd" name="md">
      <slot name="tablet">
        <slot />
      </slot>
    </slot>

    <!-- 平板版布局 -->
    <slot v-else-if="isLg" name="lg">
      <slot name="tablet">
        <slot />
      </slot>
    </slot>

    <!-- 小桌面版布局 -->
    <slot v-else-if="isXl" name="xl">
      <slot name="desktop">
        <slot />
      </slot>
    </slot>

    <!-- 桌面版布局 -->
    <slot v-else-if="is2xl" name="2xl">
      <slot name="desktop">
        <slot />
      </slot>
    </slot>

    <!-- 大桌面版布局 -->
    <slot v-else name="3xl">
      <slot name="desktop">
        <slot />
      </slot>
    </slot>
  </div>
</template>

<style scoped>
.responsive-container {
  min-height: 100%;
  width: 100%;
}
</style>

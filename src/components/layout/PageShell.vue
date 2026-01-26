<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  scrollable?: boolean
  ambient?: boolean
  contentClass?: string
  background?: 'base' | 'soft' | 'muted'
}

const props = withDefaults(defineProps<Props>(), {
  scrollable: true,
  ambient: true,
  contentClass: '',
  background: 'base',
})

const backgroundClass = computed(() => {
  switch (props.background) {
    case 'soft':
      return 'bg-[var(--color-bg-soft)]'
    case 'muted':
      return 'bg-[var(--color-bg-muted)]'
    default:
      return 'bg-[var(--color-bg)]'
  }
})
</script>

<template>
  <div class="app-page" :class="{ 'page-ambient': ambient }">
    <div :class="[scrollable ? 'app-content-scroll' : 'app-content-fit', backgroundClass]">
      <div class="page-shell" :class="contentClass">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  showExport?: boolean
  exportLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  showExport: true,
  exportLabel: '匯出'
})

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'export'): void
}>()

const handleBack = (): void => {
  emit('back')
}

const handleExport = (): void => {
  emit('export')
}
</script>

<template>
  <header class="app-header shadow-sm bg-[var(--color-surface-elevated)]">
    <div class="app-header-action">
      <button
        type="button"
        class="text-3xl text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-soft)]"
        @click="handleBack"
      >
        ←
      </button>
    </div>
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-bold text-[var(--color-text)] tracking-wide">{{ props.title }}</h1>
    </div>
    <div class="app-header-action text-right">
      <button
        v-if="props.showExport"
        type="button"
        class="text-sm font-bold text-[var(--color-primary)] px-4 py-2 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 rounded-full transition-colors"
        @click="handleExport"
      >
        {{ props.exportLabel }}
      </button>
    </div>
  </header>
</template>

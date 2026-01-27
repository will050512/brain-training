<script setup lang="ts">
import { computed } from 'vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

type MetaVariant = 'primary' | 'muted'

interface Props {
  icon: string
  title: string
  description: string
  metaLabel: string
  recommended?: boolean
  metaVariant?: MetaVariant
}

const props = withDefaults(defineProps<Props>(), {
  recommended: false,
  metaVariant: 'muted'
})

const emit = defineEmits<{
  (event: 'click'): void
}>()

const cardClasses = computed(() => {
  const base = [
    'card text-left p-5 relative group transition-all duration-300',
    'active:scale-[0.98] bg-[var(--color-surface)] shadow-sm min-h-[140px]'
  ]
  if (props.recommended) {
    base.push('border border-[var(--color-primary)]/20 hover:border-[var(--color-primary)]')
  } else {
    base.push('border border-[var(--color-border)] hover:border-[var(--color-primary)]/50')
  }
  return base.join(' ')
})

const iconClasses = computed(() => {
  if (props.metaVariant === 'primary') {
    return 'bg-[var(--color-primary-bg)]'
  }
  return 'bg-[var(--color-bg-muted)]'
})

const metaClasses = computed(() => {
  if (props.metaVariant === 'primary') {
    return 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
  }
  return 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]'
})
</script>

<template>
  <button :class="cardClasses" @click="emit('click')">
    <div v-if="recommended" class="absolute -top-2 -right-2 z-10">
      <span class="bg-[var(--color-primary)] text-[var(--color-text-inverse)] px-2 py-1 rounded-lg shadow-sm animate-pulse">
        <SubtleLabel text="推薦" size="xs" class="text-[var(--color-text-inverse)]" weight="bold" />
      </span>
    </div>
    <div class="flex items-start gap-4">
      <div :class="['text-4xl w-14 h-14 flex items-center justify-center rounded-xl shrink-0', iconClasses]">
        {{ icon }}
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-bold text-[var(--color-text)] leading-tight mb-1">{{ title }}</h3>
        <div class="flex items-center gap-1.5 mt-2">
          <span :class="['px-2 py-1 rounded text-sm', metaClasses]">
            <SubtleLabel :text="metaLabel" tone="inherit" />
          </span>
        </div>
      </div>
    </div>
    <p class="text-sm text-[var(--color-text-secondary)] mt-4 leading-relaxed line-clamp-2">
      {{ description }}
    </p>
  </button>
</template>

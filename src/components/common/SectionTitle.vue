<script setup lang="ts">
type SectionTitleTag = 'h2' | 'h3' | 'h4' | 'div'

interface Props {
  title: string
  accentClass?: string
  spacing?: 'none' | 'sm' | 'md'
  showAccent?: boolean
  size?: 'sm' | 'md'
  as?: SectionTitleTag
}

withDefaults(defineProps<Props>(), {
  accentClass: 'bg-[var(--color-primary)]',
  spacing: 'md',
  showAccent: true,
  size: 'md',
  as: 'h2'
})
</script>

<template>
  <component
    :is="as"
    class="font-bold text-[var(--color-text)] flex items-center gap-2"
    :class="[
      size === 'sm' ? 'text-[length:var(--font-size-base)]' : 'text-[length:var(--font-size-lg)]',
      spacing === 'none' ? 'mb-0' : (spacing === 'sm' ? 'mb-3' : 'mb-4')
    ]"
  >
    <span v-if="showAccent" class="w-1.5 h-5 rounded-full" :class="accentClass"></span>
    <slot name="prefix" />
    <span>{{ title }}</span>
    <slot name="after" />
  </component>
</template>

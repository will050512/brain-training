<script setup lang="ts">
type LabelSize = 'xs' | 'sm'
type LabelTone = 'muted' | 'secondary' | 'inherit'
type LabelWeight = 'medium' | 'bold'

interface Props {
  text?: string
  size?: LabelSize
  tone?: LabelTone
  weight?: LabelWeight
  caps?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  size: 'sm',
  tone: 'muted',
  weight: 'medium',
  caps: false
})

const sizeClass = props.size === 'xs'
  ? 'text-[length:calc(var(--font-size-base)*0.8)]'
  : 'text-[length:calc(var(--font-size-base)*0.9)]'
const toneClass = props.tone === 'inherit'
  ? ''
  : (props.tone === 'secondary' ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-muted)]')
const weightClass = props.weight === 'bold' ? 'font-bold' : 'font-medium'
const capsClass = props.caps ? 'uppercase tracking-wider' : ''
</script>

<template>
  <span :class="[sizeClass, toneClass, weightClass, capsClass]">
    <slot>{{ text }}</slot>
  </span>
</template>

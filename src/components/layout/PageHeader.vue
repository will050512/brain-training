<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  icon?: string
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
  icon: '',
})
</script>

<template>
  <div class="page-header">
    <div class="page-header-main">
      <span v-if="icon" class="page-header-icon" aria-hidden="true">{{ icon }}</span>
      <div class="page-header-text">
        <h2 class="page-header-title">{{ title }}</h2>
        <p v-if="subtitle" class="page-header-subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

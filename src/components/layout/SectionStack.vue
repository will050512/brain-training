<script setup lang="ts">
interface Props {
  tight?: boolean
}

withDefaults(defineProps<Props>(), {
  tight: false,
})
</script>

<template>
  <div class="section-stack" :class="{ 'section-stack-tight': tight }">
    <slot />
  </div>
</template>

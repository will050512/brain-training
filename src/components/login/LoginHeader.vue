<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
</script>

<template>
  <header class="app-header">
    <router-link to="/" custom v-slot="{ navigate }">
      <BaseButton
        variant="ghost"
        size="sm"
        class="min-h-[44px] w-11 h-11 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
        aria-label="返回"
        @click="navigate"
      >
        <span class="text-xl">←</span>
      </BaseButton>
    </router-link>
    <h1 class="app-header-title">登入 / 註冊</h1>
    <div class="app-header-action"></div>
  </header>
</template>

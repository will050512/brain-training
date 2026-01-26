<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
</script>

<template>
  <header class="bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border)] shrink-0 z-30 safe-area-top">
    <div class="px-4 sm:px-6">
      <div class="flex items-center justify-between h-14">
        <router-link to="/" custom v-slot="{ navigate }">
          <BaseButton
            variant="ghost"
            size="sm"
            class="-ml-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] gap-1 h-11 min-h-[44px]"
            @click="navigate"
          >
            <span class="text-xl">←</span>
            <span class="text-sm font-medium">返回</span>
          </BaseButton>
        </router-link>
        <h1 class="text-lg font-bold text-[var(--color-text)] tracking-wide">能力評估</h1>
        <div class="w-12"></div>
      </div>
    </div>
  </header>
</template>

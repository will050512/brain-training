<script setup lang="ts">
import SectionTitle from '@/components/common/SectionTitle.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
</script>

<template>
  <div class="card p-4 flex gap-3 bg-[var(--color-surface-soft)] border-l-4 border-[var(--color-warning)]">
    <div class="text-2xl">⚠️</div>
    <div class="flex-1 min-w-0">
      <SectionTitle title="重要聲明" as="h3" size="sm" spacing="none" :show-accent="false" />
      <SubtleLabel
        text="建議僅供參考，不能替代醫療建議。服用藥物者請務必諮詢醫師，避免交互作用。"
        tone="secondary"
        class="mt-1 leading-relaxed block"
      />
    </div>
  </div>
</template>

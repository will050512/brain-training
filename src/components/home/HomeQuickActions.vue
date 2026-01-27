<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

interface Props {
  isLoggedIn: boolean
}

const props = defineProps<Props>()
</script>

<template>
  <div class="mb-6">
    <SectionTitle title="快速開始" spacing="sm" class="px-1" />
    <div class="space-y-3">
      <template v-if="props.isLoggedIn">
        <router-link to="/games" custom v-slot="{ navigate }">
          <BaseButton
            size="lg"
            full-width
            class="shadow-md h-14 text-base rounded-2xl border-0 !text-white"
            @click="navigate"
          >
            <span class="text-2xl mr-3">🎮</span>
            自主訓練
          </BaseButton>
        </router-link>

        <div class="grid grid-cols-2 gap-3">
          <router-link to="/report" class="bg-[var(--color-surface-elevated)] p-3 rounded-2xl shadow-sm border border-[var(--color-border-light)] hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col items-center justify-center gap-2 group">
            <span class="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">📊</span>
            <div class="text-center">
              <div class="font-bold text-[var(--color-text)] text-base">詳細報告</div>
              <SubtleLabel text="查看分析" tone="secondary" class="block" />
            </div>
          </router-link>

          <router-link to="/nutrition" class="bg-[var(--color-surface-elevated)] p-3 rounded-2xl shadow-sm border border-[var(--color-border-light)] hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col items-center justify-center gap-2 group">
            <span class="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">🥗</span>
            <div class="text-center">
              <div class="font-bold text-[var(--color-text)] text-base">腦力營養</div>
              <SubtleLabel text="飲食建議" tone="secondary" class="block" />
            </div>
          </router-link>
        </div>
      </template>

      <template v-else>
        <router-link to="/login" custom v-slot="{ navigate }">
          <BaseButton
            size="lg"
            full-width
            class="shadow-md h-14 text-base rounded-2xl"
            @click="navigate"
          >
            <span class="text-2xl mr-3">👋</span>
            開始使用
          </BaseButton>
        </router-link>
      </template>
    </div>
  </div>
</template>

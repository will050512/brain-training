<template>
  <div class="card p-5 flex flex-col gap-6">
    <div>
      <label class="block text-sm font-semibold mb-3" style="color: var(--color-text-secondary)">每日訓練時間</label>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="duration in durations"
          :key="duration"
          @click="onDurationSelect(duration)"
          class="py-3 rounded-lg border-2 transition-all text-center font-medium touch-min"
          :class="selectedDuration === duration
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
            : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'"
        >
          {{ duration }}<span class="text-xs ml-0.5">分</span>
        </button>
      </div>
    </div>

    <div>
      <label class="block text-sm font-semibold mb-3" style="color: var(--color-text-secondary)">追蹤模式</label>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          @click="onModeSelect('general')"
          class="p-4 rounded-lg border-2 text-left transition-all touch-min"
          :class="selectedMode === 'general'
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
            : 'border-[var(--color-border)]'"
        >
          <p class="font-bold mb-1" :class="selectedMode === 'general' ? 'text-[var(--color-primary-dark)]' : 'text-[var(--color-text-secondary)]'">🌱 一般模式</p>
          <p class="text-xs opacity-80" style="color: var(--color-text-muted)">30天趨勢，15%閾值</p>
        </button>
        <button
          @click="onModeSelect('professional')"
          class="p-4 rounded-lg border-2 text-left transition-all touch-min"
          :class="selectedMode === 'professional'
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
            : 'border-[var(--color-border)]'"
        >
          <p class="font-bold mb-1" :class="selectedMode === 'professional' ? 'text-[var(--color-primary-dark)]' : 'text-[var(--color-text-secondary)]'">⚕️ 專業模式</p>
          <p class="text-xs opacity-80" style="color: var(--color-text-muted)">7天趨勢，7%閾值</p>
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between py-2 border-t" style="border-color: var(--color-border-light)">
      <div>
        <p class="font-bold" style="color: var(--color-text)">行為偵測</p>
        <p class="text-xs mt-1" style="color: var(--color-text-muted)">追蹤點擊模式與反應時間</p>
      </div>
      <button
        @click="onToggleBehavior"
        class="w-12 h-7 rounded-full transition-colors relative touch-min"
        :class="enableBehaviorTracking ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'"
        aria-label="Toggle behavior tracking"
      >
        <div
          class="absolute top-1 left-1 w-5 h-5 bg-[var(--color-surface)] rounded-full shadow transition-transform"
          :class="enableBehaviorTracking ? 'translate-x-5' : 'translate-x-0'"
        ></div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  selectedDuration: 10 | 15 | 20 | 30
  selectedMode: 'general' | 'professional'
  enableBehaviorTracking: boolean
  onDurationSelect: (value: 10 | 15 | 20 | 30) => void
  onModeSelect: (value: 'general' | 'professional') => void
  onToggleBehavior: () => void
}>()

const durations: Array<10 | 15 | 20 | 30> = [10, 15, 20, 30]
</script>

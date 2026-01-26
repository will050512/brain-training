<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content max-w-md animate-slide-up">
      <!-- 圖示 -->
      <div class="text-center mb-6">
        <img src="/logo.png" alt="愛護腦" class="w-24 h-24 mx-auto mb-4 drop-shadow-lg" />
        <h2 class="text-2xl font-bold text-[var(--color-text)]">歡迎使用愛護腦！</h2>
        <SubtleLabel text="一起用溫和的節奏養成每日訓練" tone="muted" class="mt-2 block" />
      </div>

      <!-- 說明文字 -->
      <div class="text-center text-[var(--color-text-secondary)] mb-8 text-base leading-relaxed">
        <p class="mb-4">
          本系統專為認知訓練設計，<br>
          透過有趣的遊戲活化您的大腦。
        </p>
        <p>
          每天花幾分鐘訓練，<br>
          就能有效提升記憶力、專注力等認知能力。
        </p>
      </div>

      <!-- 音效提示 -->
      <div class="bg-[var(--color-accent-warm)]/10 p-4 rounded-xl mb-6 border border-[var(--color-accent-warm)]/30">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🔊</span>
          <div>
            <p class="font-medium text-[var(--color-text)]">是否開啟音效？</p>
            <SubtleLabel
              text="音效可以增加遊戲趣味性，\n您可以隨時在設定中調整。"
              tone="muted"
              class="whitespace-pre-line block"
            />
          </div>
        </div>
      </div>

      <!-- 按鈕 -->
      <div class="flex gap-3">
        <BaseButton
          variant="secondary"
          size="md"
          class="flex-1 text-base"
          @click="$emit('close')"
        >
          保持靜音
        </BaseButton>
        <BaseButton
          size="md"
          class="flex-1 shadow-lg text-base"
          @click="$emit('enable-sound')"
        >
          開啟音效 🔊
        </BaseButton>
      </div>

      <!-- 特色說明 -->
      <div class="mt-8 pt-6 border-t border-[var(--color-border)]">
        <h3 class="font-semibold mb-4 text-center text-[var(--color-text)] text-base">訓練六大認知能力</h3>
        <div class="grid grid-cols-3 gap-4 text-center text-sm">
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">⚡</span>
            <SubtleLabel text="反應力" tone="secondary" />
          </div>
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">🧩</span>
            <SubtleLabel text="邏輯力" tone="secondary" />
          </div>
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">🧠</span>
            <SubtleLabel text="記憶力" tone="secondary" />
          </div>
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">💡</span>
            <SubtleLabel text="認知力" tone="secondary" />
          </div>
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">🎯</span>
            <SubtleLabel text="協調力" tone="secondary" />
          </div>
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">👁️</span>
            <SubtleLabel text="注意力" tone="secondary" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

defineEmits<{
  close: []
  'enable-sound': []
}>()
</script>

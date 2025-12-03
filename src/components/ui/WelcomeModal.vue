<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content max-w-md animate-slide-up">
      <!-- 圖示 -->
      <div class="text-center mb-6">
        <div class="text-7xl mb-4 drop-shadow-lg">🧠</div>
        <h2 class="text-2xl font-bold text-[var(--color-text)]">歡迎使用健腦訓練！</h2>
      </div>

      <!-- 說明文字 -->
      <div class="text-center text-[var(--color-text-secondary)] mb-8">
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
      <div class="bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10 p-4 rounded-lg mb-6 border border-[var(--color-primary)]/20">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🔊</span>
          <div>
            <p class="font-medium text-[var(--color-text)]">是否開啟音效？</p>
            <p class="text-sm text-[var(--color-text-muted)]">
              音效可以增加遊戲趣味性，<br>
              您可以隨時在設定中調整。
            </p>
          </div>
        </div>
      </div>

      <!-- 按鈕 -->
      <div class="flex gap-3">
        <button 
          @click="$emit('close')" 
          class="btn btn-secondary flex-1"
        >
          保持靜音
        </button>
        <button 
          @click="$emit('enable-sound')" 
          class="btn btn-primary flex-1 shadow-lg"
        >
          開啟音效 🔊
        </button>
      </div>

      <!-- 特色說明 -->
      <div class="mt-8 pt-6 border-t border-[var(--color-border)]">
        <h3 class="font-semibold mb-4 text-center text-[var(--color-text)]">訓練六大認知能力</h3>
        <div class="grid grid-cols-3 gap-4 text-center text-sm">
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">⚡</span>
            <p class="text-[var(--color-text-secondary)]">反應力</p>
          </div>
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">🧩</span>
            <p class="text-[var(--color-text-secondary)]">邏輯力</p>
          </div>
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">🧠</span>
            <p class="text-[var(--color-text-secondary)]">記憶力</p>
          </div>
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">💡</span>
            <p class="text-[var(--color-text-secondary)]">認知力</p>
          </div>
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">🎯</span>
            <p class="text-[var(--color-text-secondary)]">協調力</p>
          </div>
          <div class="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors">
            <span class="text-2xl">👁️</span>
            <p class="text-[var(--color-text-secondary)]">注意力</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  close: []
  'enable-sound': []
}>()
</script>

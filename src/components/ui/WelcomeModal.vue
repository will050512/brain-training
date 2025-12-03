<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content max-w-md animate-slide-up">
      <!-- 圖示 -->
      <div class="text-center mb-6">
        <div class="text-7xl mb-4">🧠</div>
        <h2 class="title-md">歡迎使用健腦訓練！</h2>
      </div>

      <!-- 說明文字 -->
      <div class="text-center text-gray-600 mb-8">
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
      <div class="bg-blue-50 p-4 rounded-lg mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🔊</span>
          <div>
            <p class="font-medium">是否開啟音效？</p>
            <p class="text-sm text-gray-500">
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
          class="btn btn-primary flex-1"
        >
          開啟音效 🔊
        </button>
      </div>

      <!-- 特色說明 -->
      <div class="mt-8 pt-6 border-t">
        <h3 class="font-semibold mb-4 text-center">訓練六大認知能力</h3>
        <div class="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <span class="text-2xl">⚡</span>
            <p>反應力</p>
          </div>
          <div>
            <span class="text-2xl">🧩</span>
            <p>邏輯力</p>
          </div>
          <div>
            <span class="text-2xl">🧠</span>
            <p>記憶力</p>
          </div>
          <div>
            <span class="text-2xl">💡</span>
            <p>認知力</p>
          </div>
          <div>
            <span class="text-2xl">🎯</span>
            <p>協調力</p>
          </div>
          <div>
            <span class="text-2xl">👁️</span>
            <p>注意力</p>
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

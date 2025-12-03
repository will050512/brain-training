<template>
  <Teleport to="body">
    <TransitionGroup name="toast-slide" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-item"
        :class="`toast-${toast.type}`"
        @click="remove(toast.id)"
      >
        <span class="toast-icon">{{ toast.icon }}</span>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click.stop="remove(toast.id)" aria-label="關閉">
          ✕
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: env(safe-area-inset-top, 16px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 90%;
  max-width: 400px;
  padding: 16px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--color-surface);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-border);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.2s, box-shadow 0.2s;
}

.toast-item:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
}

.toast-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.4;
}

.toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s, color 0.2s;
}

.toast-close:hover {
  background: var(--color-bg-muted);
  color: var(--color-text);
}

/* Toast 類型樣式 */
.toast-success {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #22c55e;
}

.toast-success .toast-message {
  color: #166534;
}

.toast-error {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-color: #ef4444;
}

.toast-error .toast-message {
  color: #991b1b;
}

.toast-warning {
  background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
  border-color: #eab308;
}

.toast-warning .toast-message {
  color: #854d0e;
}

.toast-info {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #3b82f6;
}

.toast-info .toast-message {
  color: #1e40af;
}

/* 深色模式 */
:where(.dark, .dark *) .toast-success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%);
  border-color: rgba(34, 197, 94, 0.5);
}

:where(.dark, .dark *) .toast-success .toast-message {
  color: #86efac;
}

:where(.dark, .dark *) .toast-error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%);
  border-color: rgba(239, 68, 68, 0.5);
}

:where(.dark, .dark *) .toast-error .toast-message {
  color: #fca5a5;
}

:where(.dark, .dark *) .toast-warning {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.1) 100%);
  border-color: rgba(234, 179, 8, 0.5);
}

:where(.dark, .dark *) .toast-warning .toast-message {
  color: #fde047;
}

:where(.dark, .dark *) .toast-info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%);
  border-color: rgba(59, 130, 246, 0.5);
}

:where(.dark, .dark *) .toast-info .toast-message {
  color: #93c5fd;
}

/* 動畫 */
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s ease;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-slide-move {
  transition: transform 0.3s ease;
}

/* 手機優化 */
@media (max-width: 640px) {
  .toast-container {
    width: 95%;
    padding: 8px;
  }

  .toast-item {
    padding: 12px 14px;
  }

  .toast-message {
    font-size: 0.875rem;
  }
}
</style>

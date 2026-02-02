<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div 
        v-if="showBanner" 
        class="pwa-update-banner"
        role="alert"
        aria-live="polite"
      >
        <div class="banner-content">
          <div class="banner-icon">🔄</div>
          <div class="banner-text">
            <strong>發現新版本！</strong>
            <span>更新後可享受最新功能與修正</span>
          </div>
          <div class="banner-actions">
            <button 
              class="btn-update"
              @click="handleUpdate"
              :disabled="props.isUpdating"
            >
              {{ props.isUpdating ? '更新中...' : '立即更新' }}
            </button>
            <button 
              v-if="!props.forceUpdate"
              class="btn-dismiss"
              @click="dismissBanner"
              :disabled="props.isUpdating"
            >
              稍後
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 離線就緒提示 -->
    <Transition name="fade">
      <div 
        v-if="showOfflineReady" 
        class="pwa-offline-toast"
        role="status"
        @click="dismissOfflineReady"
      >
        <span>✅ 應用程式已準備好離線使用</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface Props {
  needRefresh: boolean
  isOfflineReady: boolean
  isUpdating: boolean
  forceUpdate?: boolean
  onApplyUpdate: (force?: boolean) => void | Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  forceUpdate: false
})

const bannerDismissed = ref(false)
const showOfflineReady = ref(false)
const offlineDismissed = ref(false)
let dismissTimeout: number | undefined
let offlineTimeout: number | undefined

const showBanner = computed(() => {
  if (props.isUpdating) return false
  if (!props.needRefresh) return false
  if (bannerDismissed.value && !props.forceUpdate) return false
  return true
})

watch(() => props.needRefresh, (available, prev) => {
  if (!available && prev) {
    bannerDismissed.value = false
    if (dismissTimeout) {
      window.clearTimeout(dismissTimeout)
      dismissTimeout = undefined
    }
  }
})

// 監聽離線就緒狀態
watch(() => props.isOfflineReady, (ready, prev) => {
  if (!ready && prev) {
    showOfflineReady.value = false
    offlineDismissed.value = false
    if (offlineTimeout) {
      window.clearTimeout(offlineTimeout)
      offlineTimeout = undefined
    }
    return
  }
  if (ready && !offlineDismissed.value) {
    showOfflineReady.value = true
    if (offlineTimeout) {
      window.clearTimeout(offlineTimeout)
    }
    offlineTimeout = window.setTimeout(() => {
      showOfflineReady.value = false
    }, 3000)
  }
})

watch(() => props.isUpdating, (updating) => {
  if (!updating) return
  if (dismissTimeout) {
    window.clearTimeout(dismissTimeout)
    dismissTimeout = undefined
  }
  bannerDismissed.value = false
})

async function handleUpdate() {
  await props.onApplyUpdate(true)
}

function dismissBanner() {
  if (props.forceUpdate) return
  bannerDismissed.value = true
  if (dismissTimeout) {
    window.clearTimeout(dismissTimeout)
  }
  dismissTimeout = window.setTimeout(() => {
    bannerDismissed.value = false
  }, 30 * 60 * 1000)
}

function dismissOfflineReady() {
  offlineDismissed.value = true
  showOfflineReady.value = false
  if (offlineTimeout) {
    window.clearTimeout(offlineTimeout)
    offlineTimeout = undefined
  }
}
</script>

<style scoped>
.pwa-update-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  z-index: 10000;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

.banner-content {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.banner-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
  min-width: 200px;
}

.banner-text strong {
  display: block;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.banner-text span {
  font-size: 0.875rem;
  opacity: 0.9;
}

.banner-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-update {
  padding: 0.5rem 1.25rem;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-update:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.btn-update:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-dismiss {
  padding: 0.5rem 1rem;
  background: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 9999px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-dismiss:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: white;
}

.btn-dismiss:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 離線就緒提示 */
.pwa-offline-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  z-index: 10000;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* 動畫 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 響應式 */
@media (max-width: 480px) {
  .banner-content {
    flex-direction: column;
    text-align: center;
  }
  
  .banner-actions {
    width: 100%;
    justify-content: center;
  }
}
</style>

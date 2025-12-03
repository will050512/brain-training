<template>
  <Transition name="slide-up">
    <div 
      v-if="showPrompt" 
      class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50"
    >
      <div class="flex items-start gap-4">
        <div class="text-4xl">🧠</div>
        <div class="flex-1">
          <h3 class="font-bold text-lg mb-1">安裝健腦訓練</h3>
          <p class="text-gray-600 text-sm mb-4">
            安裝到主畫面，離線也能使用！
          </p>
          <div class="flex gap-2">
            <button 
              @click="installApp" 
              class="btn btn-primary text-sm px-4 py-2"
            >
              立即安裝
            </button>
            <button 
              @click="dismissPrompt" 
              class="btn btn-secondary text-sm px-4 py-2"
            >
              稍後再說
            </button>
          </div>
        </div>
        <button 
          @click="dismissPrompt" 
          class="text-gray-400 hover:text-gray-600"
          aria-label="關閉"
        >
          ✕
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const showPrompt = ref(false)
let deferredPrompt: BeforeInstallPromptEvent | null = null

function handleBeforeInstallPrompt(e: Event) {
  e.preventDefault()
  deferredPrompt = e as BeforeInstallPromptEvent
  
  // 檢查是否已經關閉過
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  if (!dismissed) {
    showPrompt.value = true
  }
}

async function installApp() {
  if (!deferredPrompt) return
  
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  
  if (outcome === 'accepted') {
    console.log('使用者接受安裝')
  }
  
  deferredPrompt = null
  showPrompt.value = false
}

function dismissPrompt() {
  showPrompt.value = false
  // 記住使用者選擇，7天後再次提示
  localStorage.setItem('pwa-install-dismissed', Date.now().toString())
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  
  // 清除過期的關閉記錄
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  if (dismissed) {
    const dismissedTime = parseInt(dismissed)
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    if (Date.now() - dismissedTime > sevenDays) {
      localStorage.removeItem('pwa-install-dismissed')
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>

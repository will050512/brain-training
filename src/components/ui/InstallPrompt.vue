<template>
  <!-- Android/Chrome 安裝提示 -->
  <Transition name="slide-up">
    <div 
      v-if="showPrompt && !isIOS && !isAppEntry" 
      class="pwa-install-banner"
    >
      <div class="pwa-install-banner-content">
        <div class="pwa-install-banner-title flex items-center gap-2">
          <img src="/logo-64.png" alt="愛護腦" class="w-5 h-5 rounded-md" />
          安裝愛護腦
        </div>
        <div class="pwa-install-banner-text">安裝到主畫面，離線也能使用！</div>
      </div>
      <div class="pwa-install-banner-actions">
        <button @click="installApp" class="pwa-install-btn pwa-install-btn-primary">
          立即安裝
        </button>
        <button @click="dismissPrompt" class="pwa-install-btn pwa-install-btn-secondary">
          稍後
        </button>
      </div>
    </div>
  </Transition>

  <!-- iOS Safari 安裝指引 -->
  <Transition name="slide-up">
    <div v-if="showIOSGuide && !isAppEntry" class="ios-install-guide">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-[var(--color-text)]">安裝到主畫面</h3>
        <button 
          @click="dismissIOSGuide" 
          class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-2"
          aria-label="關閉"
        >
          ×
        </button>
      </div>
      
      <div class="ios-install-steps">
        <div class="ios-install-step">
          <span class="ios-install-step-number">1</span>
          <span class="ios-install-step-text">
            點擊底部的 <span class="inline-flex items-center px-2 py-0.5 bg-[var(--color-bg-muted)] rounded">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M15 8a1 1 0 01-1 1H6a1 1 0 110-2h8a1 1 0 011 1zM15 12a1 1 0 01-1 1H6a1 1 0 110-2h8a1 1 0 011 1zM6 4h8a1 1 0 110 2H6a1 1 0 010-2z"/>
                <path fill-rule="evenodd" d="M10 18a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L10 15.586l2.293-2.293a1 1 0 011.414 1.414l-3 3A1 1 0 0110 18z" clip-rule="evenodd"/>
              </svg>
              分享
            </span> 按鈕
          </span>
        </div>
        
        <div class="ios-install-step">
          <span class="ios-install-step-number">2</span>
          <span class="ios-install-step-text">
            向下滑動，選擇「<strong>加入主畫面</strong>」
          </span>
        </div>
        
        <div class="ios-install-step">
          <span class="ios-install-step-number">3</span>
          <span class="ios-install-step-text">
            點擊右上角「<strong>新增</strong>」完成安裝
          </span>
        </div>
      </div>
      
      <button 
        @click="dismissIOSGuide" 
        class="w-full mt-4 py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold"
      >
        我知道了
      </button>
    </div>
  </Transition>

  <!-- 輕量提示橫幅（底部常駐，用於未安裝的手機用戶） -->
  <Transition name="fade">
    <div 
      v-if="showMiniBanner && !showPrompt && !showIOSGuide && !isAppEntry" 
      class="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] py-2 px-4 flex items-center justify-between z-40"
      style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom));"
    >
      <div class="flex items-center gap-2">
        <span class="text-xl">📲</span>
        <span class="text-sm text-[var(--color-text)]">安裝 APP 獲得更好體驗</span>
      </div>
      <div class="flex items-center gap-2">
        <button 
          @click="showFullPrompt" 
          class="text-sm font-semibold text-[var(--color-primary)]"
        >
          安裝
        </button>
        <button 
          @click="dismissMiniBanner" 
          class="text-[var(--color-text-muted)] p-1"
          aria-label="關閉"
        >
          ×
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const showPrompt = ref(false)
const showIOSGuide = ref(false)
const showMiniBanner = ref(false)
let deferredPrompt: BeforeInstallPromptEvent | null = null

// 裝置檢測
const isIOS = computed(() => {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
})

const isMobile = computed(() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})

const isStandalone = computed(() => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as unknown as { standalone?: boolean }).standalone === true
})

function checkAppEntry(): boolean {
  try {
    const flag = sessionStorage.getItem('brain-training-app-entry') || localStorage.getItem('brain-training-app-entry')
    if (flag === 'true') return true
    const source = sessionStorage.getItem('brain-training-client-source') || localStorage.getItem('brain-training-client-source')
    return !!source && source.startsWith('app-')
  } catch {
    return false
  }
}

const isAppEntry = computed(() => checkAppEntry())

// 處理 Android beforeinstallprompt 事件
function handleBeforeInstallPrompt(e: Event) {
  e.preventDefault()
  deferredPrompt = e as BeforeInstallPromptEvent
  
  // 手機用戶立即顯示（不再等待 7 天）
  if (isMobile.value && !isStandalone.value) {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    const dismissedTime = dismissed ? parseInt(dismissed) : 0
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    
    // 如果距離上次關閉超過 1 天，或從未關閉過
    if (!dismissed || dismissedTime < oneDayAgo) {
      showPrompt.value = true
    } else {
      // 顯示輕量橫幅
      showMiniBanner.value = true
    }
  }
}

async function installApp() {
  if (!deferredPrompt) return
  
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  
  if (outcome === 'accepted') {
    console.log('使用者接受安裝')
    showMiniBanner.value = false
  }
  
  deferredPrompt = null
  showPrompt.value = false
}

function dismissPrompt() {
  showPrompt.value = false
  // 記住使用者選擇，1 天後再次提示
  localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  // 顯示輕量橫幅
  showMiniBanner.value = true
}

function dismissIOSGuide() {
  showIOSGuide.value = false
  localStorage.setItem('ios-guide-dismissed', Date.now().toString())
  // 顯示輕量橫幅
  showMiniBanner.value = true
}

function dismissMiniBanner() {
  showMiniBanner.value = false
  // 記住關閉，下次進入再顯示
  sessionStorage.setItem('mini-banner-dismissed', 'true')
}

function showFullPrompt() {
  showMiniBanner.value = false
  
  if (isIOS.value) {
    showIOSGuide.value = true
  } else if (deferredPrompt) {
    showPrompt.value = true
  }
}

// 檢查 iOS 用戶是否應該顯示指引
function checkIOSPrompt() {
  if (!isIOS.value || isStandalone.value) return
  
  const dismissed = localStorage.getItem('ios-guide-dismissed')
  const dismissedTime = dismissed ? parseInt(dismissed) : 0
  const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000)
  
  // 首次進入或距離上次關閉超過 3 天
  if (!dismissed || dismissedTime < threeDaysAgo) {
    // 延遲 2 秒顯示，讓用戶先看到頁面
    setTimeout(() => {
      showIOSGuide.value = true
    }, 2000)
  } else {
    // 顯示輕量橫幅（如果沒有在本次 session 關閉過）
    if (!sessionStorage.getItem('mini-banner-dismissed')) {
      showMiniBanner.value = true
    }
  }
}

onMounted(() => {
  if (isAppEntry.value) return
  // 如果已經是 standalone 模式，不顯示任何提示
  if (isStandalone.value) return
  
  // 監聽 Android 安裝事件
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  
  // 檢查 iOS 用戶
  if (isIOS.value) {
    checkIOSPrompt()
  } else if (isMobile.value) {
    // Android 用戶，如果沒有 deferredPrompt 且沒關閉過，顯示輕量橫幅
    if (!sessionStorage.getItem('mini-banner-dismissed')) {
      // 給一點延遲讓 beforeinstallprompt 有機會觸發
      setTimeout(() => {
        if (!deferredPrompt && !showPrompt.value) {
          showMiniBanner.value = true
        }
      }, 3000)
    }
  }

  const entryGuard = window.setInterval(() => {
    if (!checkAppEntry()) return
    showPrompt.value = false
    showIOSGuide.value = false
    showMiniBanner.value = false
    window.clearInterval(entryGuard)
  }, 500)
  window.setTimeout(() => window.clearInterval(entryGuard), 6000)
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
  transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

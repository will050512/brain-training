<template>
  <div class="app-page">
    <!-- Header -->
    <header class="app-header">
      <router-link to="/" class="btn btn-icon btn-ghost text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
        <span class="text-xl">←</span>
      </router-link>
      <h1 class="app-header-title">登入 / 註冊</h1>
      <div class="app-header-action"></div>
    </header>

    <!-- Content -->
    <main class="app-content-scroll bg-[var(--color-bg)]">
      <div class="container-desktop p-fluid-md">
        
        <!-- Logo Section -->
        <div class="flex flex-col items-center justify-center py-8 mb-6">
          <div class="w-20 h-20 bg-[var(--color-surface)] rounded-2xl shadow-lg flex items-center justify-center mb-4 border border-[var(--color-border-light)]">
            <img src="/logo-64.png" alt="Logo" class="w-12 h-12" />
          </div>
          <h2 class="text-2xl font-bold text-[var(--color-text)] tracking-tight">歡迎回來</h2>
          <p class="text-[var(--color-text-muted)] mt-1 text-center max-w-[280px]">
            輸入您的資料以建立或登入帳號，我們會為您保存訓練進度
          </p>
        </div>

        <div class="max-w-md mx-auto space-y-6">
          <!-- 登入表單 -->
          <form @submit.prevent="handleSubmit" class="card shadow-lg p-6 space-y-5 border-none">
            
            <!-- 姓名 -->
            <div class="space-y-2">
              <label for="name" class="block text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                姓名
              </label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                class="input w-full bg-[var(--color-bg-soft)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all"
                placeholder="請輸入您的真實姓名"
                required
                autocomplete="name"
              />
            </div>

            <!-- 生日 -->
            <div class="space-y-2">
              <label for="birthday" class="block text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                出生日期
              </label>
              <input
                id="birthday"
                v-model="form.birthday"
                type="date"
                class="input w-full bg-[var(--color-bg-soft)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all"
                required
                :max="maxDate"
              />
            </div>

            <!-- 教育程度 & 性別 (兩欄佈局) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="space-y-2">
                <label for="education" class="block text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  教育程度
                </label>
                <div class="relative">
                  <select
                    id="education"
                    v-model="form.educationYears"
                    class="input w-full bg-[var(--color-bg-soft)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] appearance-none pr-8 transition-all"
                    required
                  >
                    <option value="" disabled>選擇年數</option>
                    <option :value="0">未受教育</option>
                    <option :value="6">國小 (6年)</option>
                    <option :value="9">國中 (9年)</option>
                    <option :value="12">高中職 (12年)</option>
                    <option :value="14">專科 (14年)</option>
                    <option :value="16">大學 (16年)</option>
                    <option :value="18">碩士+ (18年+)</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-[var(--color-text-muted)]">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <label for="gender" class="block text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  生理性別
                </label>
                <div class="relative">
                  <select
                    id="gender"
                    v-model="form.gender"
                    class="input w-full bg-[var(--color-bg-soft)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] appearance-none pr-8 transition-all"
                    required
                  >
                    <option value="unknown" disabled>選擇性別</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">其他</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-[var(--color-text-muted)]">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- 錯誤訊息 -->
            <div v-if="error" class="bg-[var(--color-danger-bg)] text-[var(--color-danger)] p-4 rounded-lg text-sm border border-[var(--color-danger)]/20 flex items-start gap-3">
              <span class="text-lg">⚠️</span>
              <p>{{ error }}</p>
            </div>

            <!-- 提交按鈕 -->
            <button
              type="submit"
              class="btn btn-primary w-full py-4 text-lg font-bold tracking-wide shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all touch-manipulation"
              :disabled="isLoading || !isFormValid"
            >
              <span v-if="isLoading" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                處理中...
              </span>
              <span v-else>開始訓練</span>
            </button>
          </form>

          <!-- 說明文字 -->
          <div class="text-center">
            <p class="text-xs text-[var(--color-text-muted)] leading-relaxed max-w-xs mx-auto">
              您的資料僅用於個人化訓練難度與認知常模對照，<br>我們嚴格保護您的隱私安全。
            </p>
          </div>

          <!-- 已存在的使用者列表 -->
          <div v-if="existingUsers.length > 0" class="pt-6 border-t border-[var(--color-border-light)]">
            <h3 class="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4 text-center">快速切換帳號</h3>
            <div class="grid gap-3">
              <button
                v-for="user in existingUsers"
                :key="user.id"
                @click="handleQuickLogin(user.id)"
                class="flex items-center w-full p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)] hover:shadow-md active:scale-[0.99] transition-all group"
              >
                <div class="w-10 h-10 rounded-full bg-[var(--color-primary-bg)] text-[var(--color-primary)] flex items-center justify-center text-lg font-bold mr-4 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                  {{ user.name.charAt(0) }}
                </div>
                <div class="flex-1 text-left">
                  <div class="font-bold text-[var(--color-text)]">{{ user.name }}</div>
                  <div class="text-xs text-[var(--color-text-muted)]">生日: {{ formatDate(user.birthday) }}</div>
                </div>
                <div class="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all">
                  →
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore, useGameStore } from '@/stores'
import type { User } from '@/types'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const gameStore = useGameStore()

// 表單資料
const form = ref({
  name: '',
  birthday: '',
  educationYears: '' as string | number,
  gender: 'unknown' as 'male' | 'female' | 'other' | 'unknown',
})

// 狀態
const isLoading = ref(false)
const error = ref<string | null>(null)
const existingUsers = ref<User[]>([])

// 最大日期（今天）
const maxDate = computed(() => {
  return new Date().toISOString().split('T')[0]
})

// 表單驗證
const isFormValid = computed(() => {
  return form.value.name.trim().length > 0 && 
         form.value.birthday.length > 0 &&
         form.value.educationYears !== '' &&
         !!form.value.gender
})

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

// 處理表單提交
async function handleSubmit(): Promise<void> {
  if (!isFormValid.value) return

  isLoading.value = true
  error.value = null

  try {
    const success = await userStore.login(
      form.value.name, 
      form.value.birthday,
      Number(form.value.educationYears),
      form.value.gender
    )
    
    if (success) {
      // 儲存當前使用者 ID
      localStorage.setItem('brain-training-current-user', userStore.currentUser!.id)
      
      // 載入遊戲記錄
      await gameStore.loadUserSessions(userStore.currentUser!.id)
      
      // 導向目標頁面或遊戲選擇頁
      const redirect = route.query.redirect as string
      router.push(redirect || '/games')
    } else {
      error.value = userStore.error || '登入失敗，請稍後再試'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '發生錯誤'
  } finally {
    isLoading.value = false
  }
}

// 快速登入
async function handleQuickLogin(odId: string): Promise<void> {
  isLoading.value = true
  error.value = null

  try {
    const success = await userStore.quickLogin(odId)
    
    if (success) {
      localStorage.setItem('brain-training-current-user', odId)
      await gameStore.loadUserSessions(odId)
      
      const redirect = route.query.redirect as string
      router.push(redirect || '/games')
    } else {
      error.value = '登入失敗'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '發生錯誤'
  } finally {
    isLoading.value = false
  }
}

// 載入已存在的使用者
onMounted(async () => {
  existingUsers.value = await userStore.fetchAllUsers()
})
</script>

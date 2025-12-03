<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
    <div class="container mx-auto px-4">
      <!-- 返回按鈕 -->
      <router-link to="/" class="btn btn-secondary mb-8">
        ← 返回首頁
      </router-link>

      <div class="max-w-md mx-auto">
        <!-- 標題 -->
        <div class="text-center mb-8">
          <div class="text-5xl mb-4">👤</div>
          <h1 class="title-md">登入 / 建立帳號</h1>
          <p class="text-gray-500 mt-2">
            輸入您的姓名和生日即可開始
          </p>
        </div>

        <!-- 登入表單 -->
        <form @submit.prevent="handleSubmit" class="card space-y-6">
          <!-- 姓名 -->
          <div>
            <label for="name" class="block text-lg font-medium mb-2">
              姓名
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              class="input"
              placeholder="請輸入您的姓名"
              required
              autocomplete="name"
            />
          </div>

          <!-- 生日 -->
          <div>
            <label for="birthday" class="block text-lg font-medium mb-2">
              生日
            </label>
            <input
              id="birthday"
              v-model="form.birthday"
              type="date"
              class="input"
              required
              :max="maxDate"
            />
          </div>

          <!-- 教育程度 -->
          <div>
            <label for="education" class="block text-lg font-medium mb-2">
              教育程度
            </label>
            <select
              id="education"
              v-model="form.educationYears"
              class="input"
              required
            >
              <option value="" disabled>請選擇教育程度</option>
              <option :value="0">未受教育</option>
              <option :value="6">國小畢業 (6年)</option>
              <option :value="9">國中畢業 (9年)</option>
              <option :value="12">高中/職畢業 (12年)</option>
              <option :value="14">專科畢業 (14年)</option>
              <option :value="16">大學畢業 (16年)</option>
              <option :value="18">碩士以上 (18年+)</option>
            </select>
            <p class="text-sm text-gray-500 mt-1">
              用於對照台灣認知功能常模資料
            </p>
          </div>

          <!-- 錯誤訊息 -->
          <div v-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg">
            {{ error }}
          </div>

          <!-- 提交按鈕 -->
          <button
            type="submit"
            class="btn btn-primary btn-xl w-full"
            :disabled="isLoading || !isFormValid"
          >
            <span v-if="isLoading">登入中...</span>
            <span v-else>開始訓練 →</span>
          </button>
        </form>

        <!-- 說明文字 -->
        <div class="mt-8 text-center text-gray-500">
          <p>💡 小提示</p>
          <p class="text-sm mt-2">
            系統會根據姓名和生日識別您的帳號，<br>
            下次使用時輸入相同資料即可繼續訓練。
          </p>
        </div>

        <!-- 已存在的使用者列表 -->
        <div v-if="existingUsers.length > 0" class="mt-8">
          <h3 class="text-center text-gray-600 mb-4">或選擇已有帳號</h3>
          <div class="space-y-2">
            <button
              v-for="user in existingUsers"
              :key="user.id"
              @click="handleQuickLogin(user.id)"
              class="btn btn-secondary w-full justify-start"
            >
              <span class="text-xl mr-3">👤</span>
              <span class="flex-1 text-left">
                {{ user.name }}
                <span class="text-gray-400 text-sm ml-2">
                  {{ formatDate(user.birthday) }}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
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
         form.value.educationYears !== ''
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
      Number(form.value.educationYears)
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

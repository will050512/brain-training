<template>
  <PageShell>
    <LoginHeader />

    <SectionStack>
      <LoginIntro />

      <div class="max-w-xl mx-auto section-stack">
        <LoginFormCard
          v-model="form"
          :calendar-system="calendarSystem"
          :year-min="yearMin"
          :year-max="yearMax"
          :is-loading="isLoading"
          :is-form-valid="isFormValid"
          :error="error"
          @update:calendarSystem="calendarSystem = $event"
          @submit="handleSubmit"
        />

        <LoginPrivacyNote />

        <LoginTransferCodeCard
          v-model:transferCode="transferCode"
          :is-loading="isLoading"
          @transfer-login="handleTransferLogin"
        />

        <LoginExistingUsersList
          :existing-users="existingUsers"
          :format-birthday="formatBirthdayToRoc"
          :get-transfer-code-preview="getTransferCodePreview"
          @quick-login="handleQuickLogin"
          @copy-code="handleCopyCode"
          @delete-user="handleDeleteUser"
        />
      </div>
    </SectionStack>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore, useGameStore } from '@/stores'
import type { User } from '@/types'
import type { CalendarSystem, LoginFormState } from '@/types/login'
import { formatTransferCode, normalizeTransferCode } from '@/services/userTransferCode'
import { formatBirthdayToRoc, normalizeBirthdayInput } from '@/utils/birthday'
import { PageShell, SectionStack } from '@/components/layout'
import LoginExistingUsersList from '@/components/login/LoginExistingUsersList.vue'
import LoginFormCard from '@/components/login/LoginFormCard.vue'
import LoginHeader from '@/components/login/LoginHeader.vue'
import LoginIntro from '@/components/login/LoginIntro.vue'
import LoginPrivacyNote from '@/components/login/LoginPrivacyNote.vue'
import LoginTransferCodeCard from '@/components/login/LoginTransferCodeCard.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const gameStore = useGameStore()

// 表單資料
const form = ref<LoginFormState>({
  name: '',
  birthYear: '' as string | number,
  birthMonth: '' as string | number,
  educationYears: '' as string | number,
  gender: 'unknown' as 'male' | 'female' | 'other' | 'unknown',
})

const calendarSystem = ref<CalendarSystem>('ad')

// 狀態
const isLoading = ref(false)
const error = ref<string | null>(null)
const existingUsers = ref<User[]>([])
const transferCode = ref('')

const currentYear = new Date().getFullYear()
const yearMin = computed(() => (calendarSystem.value === 'roc' ? 1 : 1900))
const yearMax = computed(() => (calendarSystem.value === 'roc' ? currentYear - 1911 : currentYear))

// 表單驗證
const isFormValid = computed(() => {
  const year = Number(form.value.birthYear)
  const month = Number(form.value.birthMonth)
  return form.value.name.trim().length > 0 &&
         Number.isFinite(year) &&
         Number.isFinite(month) &&
         month >= 1 &&
         month <= 12 &&
         form.value.educationYears !== '' &&
         form.value.gender !== 'unknown'
})

// 處理表單提交
async function handleSubmit(): Promise<void> {
  if (!isFormValid.value) return

  isLoading.value = true
  error.value = null

  try {
    const yearRaw = Number(form.value.birthYear)
    const monthRaw = Number(form.value.birthMonth)
    const adYear = calendarSystem.value === 'roc' ? yearRaw + 1911 : yearRaw
    const month = String(monthRaw).padStart(2, '0')
    const normalizedBirthday = normalizeBirthdayInput(`${adYear}-${month}-01`)
    if (!normalizedBirthday) {
      error.value = '出生年月格式不正確，請重新選擇'
      return
    }
    const success = await userStore.login(
      form.value.name, 
      normalizedBirthday,
      Number(form.value.educationYears),
      form.value.gender
    )
    
    if (success) {
      // 載入遊戲記錄（其餘初始化由 userStore.login 處理）
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

// 登入碼登入
async function handleTransferLogin(): Promise<void> {
  if (!transferCode.value.trim()) return
  isLoading.value = true
  error.value = null

  try {
    const success = await userStore.loginWithTransferCode(
      normalizeTransferCode(transferCode.value),
      { deferDataInit: true }
    )
    if (success) {
      const redirect = route.query.redirect as string | undefined
      router.replace({ name: 'Syncing', query: redirect ? { redirect } : {} })
    } else {
      error.value = userStore.error || '登入失敗'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '發生錯誤'
  } finally {
    isLoading.value = false
  }
}

function getTransferCodePreview(user: User): string {
  const code = userStore.getTransferCode(user)
  return formatTransferCode(code)
}

async function handleCopyCode(user: User): Promise<void> {
  try {
    const code = userStore.getTransferCode(user)
    await navigator.clipboard.writeText(code)
  } catch {
    error.value = '複製失敗，請手動抄寫登入碼'
  }
}

async function handleDeleteUser(odId: string): Promise<void> {
  const confirmed = window.confirm('確定要刪除這個帳號？此操作無法復原。')
  if (!confirmed) return

  isLoading.value = true
  error.value = null
  try {
    const success = await userStore.deleteLocalUser(odId)
    if (!success) {
      error.value = userStore.error || '刪除失敗'
      return
    }
    existingUsers.value = await userStore.fetchAllUsers()
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

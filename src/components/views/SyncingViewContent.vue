<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore, useUserStore } from '@/stores'
import { dataInitService } from '@/services/dataInitService'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const status = ref<'syncing' | 'error'>('syncing')
const detailMessage = ref('正在同步您的資料，請稍候。')

const title = computed(() => (status.value === 'error' ? '同步失敗' : '同步中'))
const subtitle = computed(() => {
  if (status.value === 'error') {
    return '請確認網路連線後重試。'
  }
  return '完成後會自動進入。'
})

async function runSync(): Promise<void> {
  const odId = userStore.currentUser?.id
  if (!odId) {
    router.replace('/login')
    return
  }

  status.value = 'syncing'
  detailMessage.value = '正在同步您的資料，請稍候。'

  await dataInitService.initUserData(odId, { forceRestore: true, mode: 'fast' })

  if (dataInitService.syncStatus.value === 'error') {
    status.value = 'error'
    detailMessage.value = '同步過程發生問題，暫時無法完成。'
    return
  }

  await userStore.refreshCurrentUserData()

  const redirect = route.query.redirect as string | undefined
  const target = redirect || '/'
  const resolved = router.resolve(target)
  const requiresAssessment = resolved.matched.some(record => record.meta.requiresAssessment)
  const nextPath = requiresAssessment && !settingsStore.hasCompletedAssessment ? '/' : target
  router.replace(nextPath)
}

onMounted(() => {
  runSync().catch(error => {
    console.error('Syncing failed:', error)
    status.value = 'error'
    detailMessage.value = '同步過程發生問題，請稍後再試。'
  })
})
</script>

<template>
  <div class="syncing-screen">
    <div class="syncing-card">
      <div class="syncing-icon" aria-hidden="true">
        {{ status === 'error' ? '⚠️' : '🔄' }}
      </div>
      <h1 class="syncing-title">{{ title }}</h1>
      <p class="syncing-subtitle">{{ subtitle }}</p>
      <p class="syncing-detail">{{ detailMessage }}</p>

      <div v-if="status === 'error'" class="syncing-actions">
        <BaseButton type="button" variant="primary" @click="runSync">
          重新同步
        </BaseButton>
        <BaseButton type="button" variant="secondary" @click="router.replace('/')">
          返回首頁
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.syncing-screen {
  min-height: 100vh;
  min-height: 100dvh;
  min-height: var(--app-height);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background: var(--gradient-hero);
}

.syncing-card {
  width: min(460px, 100%);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-lg);
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.syncing-icon {
  font-size: 2.5rem;
  margin-bottom: var(--spacing-sm);
}

.syncing-title {
  margin: 0 0 var(--spacing-xs);
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text);
}

.syncing-subtitle {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

.syncing-detail {
  margin: 0 0 var(--spacing-md);
  color: var(--color-text-muted);
}

.syncing-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const STORAGE_KEY = 'brain-training-last-external-profile'
const isOpen = ref(true)
const rawPayload = ref<string | null>(null)

function loadPayload(): void {
  try {
    rawPayload.value = localStorage.getItem(STORAGE_KEY)
  } catch {
    rawPayload.value = null
  }
}

const formattedPayload = computed(() => {
  if (!rawPayload.value) return ''
  try {
    const parsed = JSON.parse(rawPayload.value)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return rawPayload.value
  }
})

let poller: number | undefined

onMounted(() => {
  loadPayload()
  poller = window.setInterval(loadPayload, 1000)
})

onBeforeUnmount(() => {
  if (poller) window.clearInterval(poller)
})
</script>

<template>
  <div class="external-debug-panel" :class="{ 'is-collapsed': !isOpen }">
    <button class="toggle" type="button" @click="isOpen = !isOpen">
      外部登入 Debug
    </button>
    <div v-if="isOpen" class="content">
      <div class="meta">
        <span class="label">最後收到的外部設定檔</span>
        <span v-if="!rawPayload" class="status">尚無資料</span>
      </div>
      <pre v-if="rawPayload" class="payload">{{ formattedPayload }}</pre>
    </div>
  </div>
</template>

<style scoped>
.external-debug-panel {
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: 320px;
  max-height: 50vh;
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.3);
  z-index: 60;
  overflow: hidden;
  font-size: 12px;
}

.external-debug-panel.is-collapsed {
  width: auto;
}

.toggle {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: rgba(30, 41, 59, 0.8);
  color: inherit;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.content {
  padding: 10px;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.label {
  opacity: 0.85;
}

.status {
  color: #fbbf24;
}

.payload {
  white-space: pre-wrap;
  word-break: break-word;
  background: rgba(15, 23, 42, 0.6);
  padding: 8px;
  border-radius: 8px;
  max-height: 32vh;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.2);
}
</style>

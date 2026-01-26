<script setup lang="ts">
import type { User } from '@/types'

interface Props {
  existingUsers: User[]
  formatBirthday: (birthday: string) => string
  getTransferCodePreview: (user: User) => string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'quick-login', id: string): void
  (e: 'copy-code', user: User): void
  (e: 'delete-user', id: string): void
}>()
</script>

<template>
  <div v-if="props.existingUsers.length > 0" class="pt-6 border-t border-[var(--color-border-light)]">
    <h3 class="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4 text-center">快速切換帳號</h3>
    <div class="grid gap-3">
      <div
        v-for="user in props.existingUsers"
        :key="user.id"
        class="flex items-center w-full p-2 sm:p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)] hover:shadow-md transition-all"
      >
        <button
          type="button"
          class="flex items-center flex-1 min-h-[56px] text-left group"
          @click="emit('quick-login', user.id)"
        >
          <div class="w-10 h-10 rounded-full bg-[var(--color-primary-bg)] text-[var(--color-primary)] flex items-center justify-center text-lg font-bold mr-4 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
            {{ user.name.charAt(0) }}
          </div>
          <div class="flex-1 text-left">
            <div class="font-bold text-[var(--color-text)]">{{ user.name }}</div>
            <div class="text-xs text-[var(--color-text-muted)]">生日: {{ props.formatBirthday(user.birthday) }}</div>
            <div class="text-[10px] text-[var(--color-text-muted)]">登入碼: {{ props.getTransferCodePreview(user) }}</div>
          </div>
        </button>
        <div class="flex items-center gap-2 ml-2">
          <button
            type="button"
            class="btn btn-ghost btn-sm !px-2 !py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] min-h-[44px]"
            @click="emit('copy-code', user)"
          >
            複製碼
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm !px-2 !py-2 text-xs text-[var(--color-danger)] hover:text-[var(--color-danger)] min-h-[44px]"
            @click="emit('delete-user', user.id)"
          >
            刪除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
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
    <SectionTitle title="快速切換帳號" as="h3" size="sm" spacing="sm" :show-accent="false" class="justify-center text-center" />
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
            <SubtleLabel :text="`生日: ${props.formatBirthday(user.birthday)}`" tone="muted" class="block" />
            <SubtleLabel :text="`登入碼: ${props.getTransferCodePreview(user)}`" size="xs" tone="muted" class="block" />
          </div>
        </button>
        <div class="flex items-center gap-2 ml-2">
          <BaseButton
            type="button"
            variant="ghost"
            size="sm"
            class="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
            @click="emit('copy-code', user)"
          >
            複製碼
          </BaseButton>
          <BaseButton
            type="button"
            variant="ghost"
            size="sm"
            class="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
            @click="emit('delete-user', user.id)"
          >
            刪除
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

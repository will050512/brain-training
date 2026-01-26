<script setup lang="ts">
interface Props {
  transferCode: string
  isLoading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:transferCode', value: string): void
  (e: 'transfer-login'): void
}>()

const handleTransferLogin = (): void => {
  emit('transfer-login')
}
</script>

<template>
  <div class="card p-4 sm:p-5 border border-[var(--color-border)] bg-[var(--color-surface)]">
    <h3 class="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 text-center">
      其他設備登入
    </h3>
    <div class="space-y-3">
      <div class="space-y-2">
        <label for="transferCode" class="block text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
          登入碼
        </label>
        <input
          id="transferCode"
          :value="props.transferCode"
          type="text"
          class="input w-full bg-[var(--color-bg-soft)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all"
          placeholder="貼上登入碼"
          @input="emit('update:transferCode', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <button
        type="button"
        class="btn btn-secondary w-full py-3 text-base font-bold"
        :disabled="props.isLoading || props.transferCode.trim().length === 0"
        @click="handleTransferLogin"
      >
        使用登入碼登入
      </button>
      <p class="text-xs text-[var(--color-text-muted)] text-center">
        登入碼可讓您在其他設備建立相同帳號；資料同步仍以本機為主。
      </p>
    </div>
  </div>
</template>

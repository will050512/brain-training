<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
import type { CalendarSystem, LoginFormState } from '@/types/login'

interface Props {
  modelValue: LoginFormState
  calendarSystem: CalendarSystem
  yearMin: number
  yearMax: number
  isLoading: boolean
  isFormValid: boolean
  error: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: LoginFormState): void
  (e: 'update:calendarSystem', value: CalendarSystem): void
  (e: 'submit'): void
}>()

const updateField = (field: keyof LoginFormState, value: LoginFormState[keyof LoginFormState]): void => {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

const handleSubmit = (): void => {
  emit('submit')
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="card shadow-lg p-6 space-y-5 border-none">
    <div class="space-y-2">
      <label for="name" class="block">
        <SubtleLabel text="姓名" tone="secondary" weight="bold" caps />
      </label>
      <input
        id="name"
        :value="props.modelValue.name"
        type="text"
        class="input w-full bg-[var(--color-bg-soft)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all"
        placeholder="請輸入您的真實姓名"
        required
        autocomplete="name"
        @input="updateField('name', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="space-y-2">
      <label class="block">
        <SubtleLabel text="出生年月" tone="secondary" weight="bold" caps />
      </label>
      <div class="flex items-center gap-2">
        <BaseButton
          type="button"
          size="sm"
          :variant="props.calendarSystem === 'ad' ? 'primary' : 'secondary'"
          class="px-3"
          :class="props.calendarSystem === 'ad' ? '' : 'bg-[var(--color-bg-soft)]'"
          @click="emit('update:calendarSystem', 'ad')"
        >
          西元
        </BaseButton>
        <BaseButton
          type="button"
          size="sm"
          :variant="props.calendarSystem === 'roc' ? 'primary' : 'secondary'"
          class="px-3"
          :class="props.calendarSystem === 'roc' ? '' : 'bg-[var(--color-bg-soft)]'"
          @click="emit('update:calendarSystem', 'roc')"
        >
          民國
        </BaseButton>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <input
          id="birthYear"
          :value="props.modelValue.birthYear"
          type="number"
          inputmode="numeric"
          class="input w-full bg-[var(--color-bg-soft)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all"
          :min="props.yearMin"
          :max="props.yearMax"
          :placeholder="props.calendarSystem === 'roc' ? '民國年' : '西元年'"
          required
          @input="updateField('birthYear', ($event.target as HTMLInputElement).value)"
        />
        <select
          id="birthMonth"
          :value="props.modelValue.birthMonth"
          class="input w-full bg-[var(--color-bg-soft)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] appearance-none pr-8 transition-all"
          required
          @change="updateField('birthMonth', Number(($event.target as HTMLSelectElement).value))"
        >
          <option value="" disabled>月份</option>
          <option v-for="m in 12" :key="m" :value="m">{{ m }} 月</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div class="space-y-2">
        <label for="education" class="block">
          <SubtleLabel text="教育程度" tone="secondary" weight="bold" caps />
        </label>
        <div class="relative">
          <select
            id="education"
            :value="props.modelValue.educationYears"
            class="input w-full bg-[var(--color-bg-soft)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] appearance-none pr-8 transition-all"
            required
            @change="updateField('educationYears', Number(($event.target as HTMLSelectElement).value))"
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
        <label for="gender" class="block">
          <SubtleLabel text="生理性別" tone="secondary" weight="bold" caps />
        </label>
        <div class="relative">
          <select
            id="gender"
            :value="props.modelValue.gender"
            class="input w-full bg-[var(--color-bg-soft)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] appearance-none pr-8 transition-all"
            required
            @change="updateField('gender', ($event.target as HTMLSelectElement).value as LoginFormState['gender'])"
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

    <div v-if="props.error" class="bg-[var(--color-danger-bg)] text-[var(--color-danger)] p-4 rounded-lg text-sm border border-[var(--color-danger)]/20 flex items-start gap-3">
      <span class="text-lg">⚠️</span>
      <p>{{ props.error }}</p>
    </div>

    <BaseButton
      type="submit"
      size="lg"
      full-width
      class="py-4 text-lg font-bold tracking-wide shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all touch-manipulation"
      :disabled="props.isLoading || !props.isFormValid"
    >
      <span v-if="props.isLoading" class="flex items-center justify-center gap-2">
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        處理中...
      </span>
      <span v-else>開始訓練</span>
    </BaseButton>
  </form>
</template>

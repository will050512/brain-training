<template>
  <div class="card p-5 flex flex-col gap-5">
    <div>
      <label class="block text-sm font-semibold mb-2" style="color: var(--color-text-secondary)">暱稱</label>
      <input
        :value="userName"
        type="text"
        placeholder="請輸入您的暱稱"
        class="input"
        @input="onNameInput"
      />
    </div>

    <div>
      <label class="block text-sm font-semibold mb-2" style="color: var(--color-text-secondary)">年齡</label>
      <input
        :value="userAge ?? ''"
        type="number"
        placeholder="請輸入年齡"
        min="1"
        max="120"
        class="input"
        @input="onAgeInput"
      />
    </div>

    <div>
      <label class="block text-sm font-semibold mb-2" style="color: var(--color-text-secondary)">性別</label>
      <div class="flex gap-3">
        <button
          v-for="gender in genders"
          :key="gender.value"
          @click="onGenderSelect(gender.value)"
          class="flex-1 py-3 rounded-lg border-2 transition-all font-medium touch-min"
          :class="userGender === gender.value
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
            : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'"
        >
          {{ gender.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  userName: string
  userAge: number | null
  userGender: 'male' | 'female' | 'other'
}>()

const emit = defineEmits<{
  (event: 'update:userName', value: string): void
  (event: 'update:userAge', value: number | null): void
  (event: 'update:userGender', value: 'male' | 'female' | 'other'): void
}>()

const genders = [
  { value: 'male', label: '👨 男' },
  { value: 'female', label: '👩 女' },
  { value: 'other', label: '🙂 其他' }
] as const

function onNameInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:userName', target.value)
}

function onAgeInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value ? Number(target.value) : null
  emit('update:userAge', value !== null && Number.isNaN(value) ? null : value)
}

function onGenderSelect(value: 'male' | 'female' | 'other') {
  emit('update:userGender', value)
}
</script>

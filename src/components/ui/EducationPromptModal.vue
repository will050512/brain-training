<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type Props = {
  modelValue: boolean
  initialYears?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  initialYears: null,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', value: number): void
}>()

const presets = [6, 9, 12, 16]
const inputValue = ref('')

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      inputValue.value = props.initialYears ? String(props.initialYears) : ''
    }
  },
  { immediate: true }
)

const parsedValue = computed(() => Number(inputValue.value))
const isValid = computed(() => Number.isFinite(parsedValue.value) && parsedValue.value >= 1 && parsedValue.value <= 30)

function handleSave(): void {
  if (!isValid.value) return
  emit('save', Math.round(parsedValue.value))
  emit('update:modelValue', false)
}
</script>

<template>
  <Transition name="modal">
    <div v-if="modelValue" class="modal-overlay">
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="education-title">
        <h2 id="education-title" class="text-xl font-bold text-[var(--color-text)] mb-2">
          請補充學歷年數
        </h2>
        <p class="text-sm text-[var(--color-text-secondary)] mb-4">
          為了提供更精準的評估與報告，需要您的最高學歷年數。
        </p>

        <div class="space-y-3">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              v-for="years in presets"
              :key="years"
              type="button"
              class="btn btn-secondary btn-sm"
              @click="inputValue = String(years)"
            >
              {{ years }} 年
            </button>
          </div>

          <label class="text-sm text-[var(--color-text-muted)]">學歷年數</label>
          <input
            v-model="inputValue"
            type="number"
            min="1"
            max="30"
            inputmode="numeric"
            class="input w-full"
            placeholder="例如 12"
          />
          <p v-if="!isValid && inputValue !== ''" class="text-xs text-red-600">
            請輸入 1 到 30 之間的數字。
          </p>
        </div>

        <div class="mt-5">
          <button class="btn btn-primary w-full" :disabled="!isValid" @click="handleSave">
            確認
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

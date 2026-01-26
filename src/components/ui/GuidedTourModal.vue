<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

type GuidedStep = {
  title: string
  body: string
  hint?: string
}

type Props = {
  modelValue: boolean
  steps?: GuidedStep[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  steps: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const defaultSteps: GuidedStep[] = [
  {
    title: '歡迎回來，這裡是你的首頁',
    body: '首頁會顯示每日訓練、進度與報告入口。跟著這幾步，很快就能熟悉使用方式。',
  },
  {
    title: '記住你的登入碼',
    body: '姓名旁邊的「登入碼」是跨裝置登入用，點一下即可複製，回家也不怕忘記。',
    hint: '若換手機或平板，只要輸入登入碼就能還原資料。',
  },
  {
    title: '開始每日訓練',
    body: '點「開始今日訓練」，系統會安排適合的遊戲，幫助你維持腦力。',
    hint: '每日完成會累積成就與長期趨勢。',
  },
  {
    title: '查看報告與調整設定',
    body: '在「詳細報告」可看趨勢，設定頁可調整字體、音量與同步。',
    hint: '字體越大越好讀，適合長者使用。',
  },
]

const steps = computed(() => (props.steps && props.steps.length > 0 ? props.steps : defaultSteps))
const fallbackStep: GuidedStep = defaultSteps[0] ?? { title: '', body: '' }
const currentIndex = ref(0)

const total = computed(() => steps.value.length)
const isFirst = computed(() => currentIndex.value === 0)
const isLast = computed(() => currentIndex.value >= total.value - 1)
const current = computed<GuidedStep>(() => (
  steps.value[currentIndex.value] ?? steps.value[0] ?? fallbackStep
))

watch(
  () => props.modelValue,
  (open) => {
    if (open) currentIndex.value = 0
  },
  { immediate: true }
)

function close(): void {
  emit('update:modelValue', false)
}

function next(): void {
  if (isLast.value) {
    close()
    return
  }
  currentIndex.value += 1
}

function prev(): void {
  if (isFirst.value) return
  currentIndex.value -= 1
}
</script>

<template>
  <Transition name="modal">
    <div v-if="modelValue" class="modal-overlay">
      <div class="modal-content max-w-lg overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div class="bg-[var(--color-primary)]/10 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <SubtleLabel
              :text="`新手導覽 · 步驟 ${currentIndex + 1} / ${total}`"
              class="text-[var(--color-primary)]"
              weight="bold"
            />
            <h2 id="tour-title" class="text-xl font-bold text-[var(--color-text)] mt-1">
              {{ current.title }}
            </h2>
          </div>
          <BaseButton
            variant="ghost"
            size="sm"
            class="text-[var(--color-text-muted)] min-h-[44px]"
            @click="close"
            aria-label="關閉教學"
          >
            ✕
          </BaseButton>
        </div>

        <div class="px-5 py-4">
          <p class="text-base text-[var(--color-text-secondary)] leading-relaxed">
            {{ current.body }}
          </p>
          <SubtleLabel v-if="current.hint" :text="current.hint" tone="muted" class="mt-3 block" />

          <div class="mt-4 flex items-center gap-2">
            <span
              v-for="n in total"
              :key="n"
              class="h-2.5 w-2.5 rounded-full"
              :class="n - 1 === currentIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'"
            ></span>
          </div>

          <div class="mt-6 flex flex-wrap items-center justify-between gap-2">
            <BaseButton
              type="button"
              variant="secondary"
              size="sm"
              class="min-h-[44px] px-4"
              :disabled="isFirst"
              @click="prev"
            >
              上一步
            </BaseButton>
            <div class="flex items-center gap-2">
              <BaseButton
                type="button"
                variant="ghost"
                size="sm"
                class="min-h-[44px] px-4 text-[var(--color-text-secondary)]"
                @click="close"
              >
                稍後再看
              </BaseButton>
              <BaseButton
                type="button"
                size="sm"
                class="min-h-[44px] px-5"
                @click="next"
              >
                {{ isLast ? '完成' : '下一步' }}
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

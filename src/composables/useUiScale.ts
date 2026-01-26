import { onMounted, onUnmounted, watch } from 'vue'
import { useResponsive } from '@/composables/useResponsive'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function applyUiScale(width: number, height: number): void {
  const baseWidth = 420
  const baseHeight = 780
  const baseRatio = Math.min(width / baseWidth, height / baseHeight)
  const uiScale = clamp(baseRatio, 0.9, 1.3)
  const spaceScale = clamp(1.05 - (uiScale - 1) * 0.35, 0.78, 1)

  const root = document.documentElement
  root.style.setProperty('--ui-scale', uiScale.toFixed(3))
  root.style.setProperty('--ui-space-scale', spaceScale.toFixed(3))
}

export function useUiScale(): void {
  const { screenWidth, screenHeight } = useResponsive()

  const updateScale = (): void => {
    const width = screenWidth.value || window.innerWidth
    const height = screenHeight.value || window.innerHeight
    applyUiScale(width, height)
  }

  onMounted(() => {
    updateScale()
  })

  watch([screenWidth, screenHeight], () => {
    updateScale()
  })

  onUnmounted(() => {
    // No-op for now. useResponsive handles its own listeners.
  })
}

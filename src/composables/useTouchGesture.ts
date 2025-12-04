/**
 * 觸控手勢偵測 Composable
 * 支援四方向滑動偵測（上/下/左/右）
 * 用於遊戲控制和導航
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | null

export interface TouchGestureOptions {
  /** 最小滑動距離（像素），預設 30 */
  threshold?: number
  /** 是否阻止預設事件（防止頁面滾動），預設 true */
  preventDefault?: boolean
  /** 滑動回調函式 */
  onSwipe?: (direction: SwipeDirection) => void
  /** 滑動開始回調 */
  onTouchStart?: (e: TouchEvent) => void
  /** 滑動結束回調 */
  onTouchEnd?: (e: TouchEvent) => void
}

export interface TouchGestureReturn {
  /** 當前滑動方向 */
  direction: Ref<SwipeDirection>
  /** 是否正在觸控 */
  isTouching: Ref<boolean>
  /** 綁定到元素的事件處理器 */
  handlers: {
    onTouchstart: (e: TouchEvent) => void
    onTouchmove: (e: TouchEvent) => void
    onTouchend: (e: TouchEvent) => void
    onTouchcancel: (e: TouchEvent) => void
  }
  /** 手動綁定到指定元素 */
  bindToElement: (element: HTMLElement | null) => void
  /** 解除綁定 */
  unbindFromElement: (element: HTMLElement | null) => void
}

/**
 * 觸控手勢偵測
 * @param options 配置選項
 * @returns 觸控手勢狀態和處理器
 */
export function useTouchGesture(options: TouchGestureOptions = {}): TouchGestureReturn {
  const {
    threshold = 30,
    preventDefault = true,
    onSwipe,
    onTouchStart,
    onTouchEnd,
  } = options

  const direction = ref<SwipeDirection>(null)
  const isTouching = ref(false)

  // 觸控起始點
  let startX = 0
  let startY = 0
  let startTime = 0

  /**
   * 計算滑動方向
   */
  function calculateDirection(deltaX: number, deltaY: number): SwipeDirection {
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // 檢查是否達到閾值
    if (absDeltaX < threshold && absDeltaY < threshold) {
      return null
    }

    // 判斷主要方向
    if (absDeltaX > absDeltaY) {
      // 水平滑動
      return deltaX > 0 ? 'right' : 'left'
    } else {
      // 垂直滑動
      return deltaY > 0 ? 'down' : 'up'
    }
  }

  /**
   * 觸控開始處理
   */
  function handleTouchStart(e: TouchEvent): void {
    // 只處理單點觸控
    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    if (!touch) return

    startX = touch.clientX
    startY = touch.clientY
    startTime = Date.now()
    isTouching.value = true
    direction.value = null

    onTouchStart?.(e)
  }

  /**
   * 觸控移動處理
   */
  function handleTouchMove(e: TouchEvent): void {
    if (!isTouching.value) return

    // 阻止頁面滾動
    if (preventDefault) {
      e.preventDefault()
    }
  }

  /**
   * 觸控結束處理
   */
  function handleTouchEnd(e: TouchEvent): void {
    if (!isTouching.value) return

    const touch = e.changedTouches[0]
    if (!touch) {
      isTouching.value = false
      return
    }

    const endX = touch.clientX
    const endY = touch.clientY
    const deltaX = endX - startX
    const deltaY = endY - startY
    const duration = Date.now() - startTime

    // 計算方向（只在 500ms 內的滑動才視為有效手勢）
    if (duration < 500) {
      const swipeDirection = calculateDirection(deltaX, deltaY)
      direction.value = swipeDirection

      if (swipeDirection) {
        onSwipe?.(swipeDirection)
      }
    }

    isTouching.value = false
    onTouchEnd?.(e)
  }

  /**
   * 觸控取消處理
   */
  function handleTouchCancel(_e: TouchEvent): void {
    isTouching.value = false
    direction.value = null
  }

  // 事件處理器物件（用於 Vue 模板綁定）
  const handlers = {
    onTouchstart: handleTouchStart,
    onTouchmove: handleTouchMove,
    onTouchend: handleTouchEnd,
    onTouchcancel: handleTouchCancel,
  }

  /**
   * 綁定到指定 DOM 元素
   */
  function bindToElement(element: HTMLElement | null): void {
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('touchcancel', handleTouchCancel)
  }

  /**
   * 解除綁定
   */
  function unbindFromElement(element: HTMLElement | null): void {
    if (!element) return

    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
    element.removeEventListener('touchend', handleTouchEnd)
    element.removeEventListener('touchcancel', handleTouchCancel)
  }

  return {
    direction,
    isTouching,
    handlers,
    bindToElement,
    unbindFromElement,
  }
}

/**
 * 自動綁定到 ref 元素的版本
 * @param elementRef 元素的 ref
 * @param options 配置選項
 */
export function useTouchGestureOnElement(
  elementRef: Ref<HTMLElement | null>,
  options: TouchGestureOptions = {}
): Omit<TouchGestureReturn, 'bindToElement' | 'unbindFromElement' | 'handlers'> {
  const gesture = useTouchGesture(options)

  onMounted(() => {
    gesture.bindToElement(elementRef.value)
  })

  onUnmounted(() => {
    gesture.unbindFromElement(elementRef.value)
  })

  return {
    direction: gesture.direction,
    isTouching: gesture.isTouching,
  }
}

export default useTouchGesture

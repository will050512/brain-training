import { test, expect } from '../fixtures/setup'
import { goTo } from '../utils/navigation'

declare global {
  interface Window {
    __PWA_TEST__?: {
      setNeedRefresh: () => void
      clearNeedRefresh: () => void
      setOfflineReady: () => void
      setVisibility: (state: 'visible' | 'hidden') => void
      setUpdating: (value: boolean) => void
      triggerVisibilityChange: () => void
      setSkipReload: (value: boolean) => void
      completeUpdate: () => void
      getState: () => {
        needRefresh: boolean
        isUpdating: boolean
        isUserActive: boolean
        pendingAutoUpdate: boolean
      }
    }
  }
}

const UPDATE_GATE_SELECTOR = '.app-update-gate'
const UPDATE_BANNER_SELECTOR = '.pwa-update-banner'

test.describe('PWA update flow', () => {
  test('no update shows no update gate or banner', async ({ page }) => {
    await goTo(page, '/')
    await expect(page.locator(UPDATE_GATE_SELECTOR)).toHaveCount(0)
    await expect(page.locator(UPDATE_BANNER_SELECTOR)).toHaveCount(0)
  })

  test('active user gets banner without blocking', async ({ page }) => {
    await goTo(page, '/')

    await page.evaluate(() => {
      window.__PWA_TEST__?.setNeedRefresh()
    })

    await expect(page.locator(UPDATE_BANNER_SELECTOR)).toBeVisible()
    await expect(page.locator(UPDATE_GATE_SELECTOR)).toHaveCount(0)
  })

  test('inactive user auto-applies update without showing banner', async ({ page }) => {
    await goTo(page, '/')

    await page.evaluate(() => {
      window.__PWA_TEST__?.setSkipReload(true)
      window.__PWA_TEST__?.setVisibility('hidden')
      window.__PWA_TEST__?.setNeedRefresh()
      window.__PWA_TEST__?.triggerVisibilityChange()
      window.__PWA_TEST__?.setVisibility('visible')
      window.__PWA_TEST__?.triggerVisibilityChange()
    })

    await expect(page.locator(UPDATE_GATE_SELECTOR)).toBeVisible()
    await expect(page.locator(UPDATE_BANNER_SELECTOR)).toHaveCount(0)

    await page.evaluate(() => {
      window.__PWA_TEST__?.completeUpdate()
    })

    await expect(page.locator(UPDATE_GATE_SELECTOR)).toHaveCount(0)
  })
})

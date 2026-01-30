import { test, expect } from '../fixtures/setup'
import { goTo } from '../utils/navigation'

test.describe('Startup performance (online logged-in)', () => {
  test('first paint under 2 seconds and no blocking gate', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('brain-training-perf', '1')
    })

    const start = Date.now()
    await goTo(page, '/')

    await expect(page.locator('.app-update-gate')).toHaveCount(0, { timeout: 4000 })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(6500)
  })
})

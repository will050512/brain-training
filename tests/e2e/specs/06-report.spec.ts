import { test, expect } from '../fixtures/setup'
import { goTo } from '../utils/navigation'

test.describe('Report Views', () => {
  test('report renders with seeded data', async ({ page }) => {
    await goTo(page, '/report')
    await page.waitForSelector('.app-update-gate', { state: 'detached', timeout: 20000 })
    await expect(page.getByLabel('認知評估報告').first()).toBeVisible({ timeout: 20000 })
    await expect(page).toHaveScreenshot('report.png', { fullPage: true, maxDiffPixelRatio: 0.05 })
  })

  test('weekly report renders with seeded data', async ({ page }) => {
    await goTo(page, '/weekly-report')
    await page.waitForSelector('.app-update-gate', { state: 'detached', timeout: 20000 })
    await expect(page.getByLabel('週訓練報告').first()).toBeVisible({ timeout: 20000 })
    await expect(page).toHaveScreenshot('weekly-report.png', { fullPage: true, maxDiffPixelRatio: 0.05 })
  })
})

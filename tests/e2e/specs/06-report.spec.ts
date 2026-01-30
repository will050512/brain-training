import { test, expect } from '../fixtures/setup'
import { goTo } from '../utils/navigation'

test.describe('Report Views', () => {
  test('report renders with seeded data', async ({ page }) => {
    await goTo(page, '/report')
    await expect(page.getByText('認知評估報告')).toBeVisible()
    await expect(page).toHaveScreenshot('report.png', { fullPage: true })
  })

  test('weekly report renders with seeded data', async ({ page }) => {
    await goTo(page, '/weekly-report')
    await expect(page.getByRole('heading', { level: 1, name: '週訓練報告' })).toBeVisible()
    await expect(page).toHaveScreenshot('weekly-report.png', { fullPage: true })
  })
})

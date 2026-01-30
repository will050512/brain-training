import { test, expect } from '../fixtures/setup'
import { goTo } from '../utils/navigation'

test.describe('Daily Challenge', () => {
  test('daily challenge list shows and start button works', async ({ page }) => {
    await goTo(page, '/daily-challenge')
    await expect(page.getByRole('heading', { level: 2, name: '每日挑戰' })).toBeVisible()
    await expect(page.getByRole('button', { name: /開始今日訓練|繼續訓練|今日已完成/ })).toBeVisible()
    await expect(page).toHaveScreenshot('daily-challenge.png', { fullPage: true })
  })
})

import { test, expect } from '../fixtures/setup'
import { goTo } from '../utils/navigation'

test.describe('Single Game Flow', () => {
  test('game select grid and open a game', async ({ page }) => {
    await goTo(page, '/games')
    await expect(page.getByRole('heading', { level: 2, name: '遊戲訓練' })).toBeVisible()
    await expect(page).toHaveScreenshot('game-select.png', { fullPage: true, maxDiffPixelRatio: 0.05 })

    await page.getByRole('button', { name: /打地鼠|翻牌配對|Stroop測試/ }).first().click()
    await expect(page.getByRole('button', { name: '開始遊戲' })).toBeVisible()
    await expect(page).toHaveScreenshot('game-ready.png', { fullPage: true, maxDiffPixelRatio: 0.05 })
  })
})

import { test, expect } from '../fixtures/setup'
import { goTo } from '../utils/navigation'

test.describe('Single Game Flow', () => {
  test('game select grid and open a game', async ({ page }) => {
    await goTo(page, '/games')
    await expect(page.getByRole('heading', { level: 2, name: '遊戲訓練' })).toBeVisible()
    await expect(page).toHaveScreenshot('game-select.png', { fullPage: true, maxDiffPixelRatio: 0.05 })

    await page.waitForSelector('.app-update-gate', { state: 'detached', timeout: 20000 })
    await page.waitForSelector('[data-game-id]', { timeout: 20000 })
    await page.locator('[data-game-id]').first().click({ timeout: 20000 })
    await expect(page.getByRole('button', { name: '開始遊戲' })).toBeVisible()
    await expect(page).toHaveScreenshot('game-ready.png', { fullPage: true, maxDiffPixelRatio: 0.05 })
  })
})

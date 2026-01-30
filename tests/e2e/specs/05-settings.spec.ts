import { test, expect } from '../fixtures/setup'
import { goTo } from '../utils/navigation'

test.describe('Settings', () => {
  test('settings toggles and theme buttons are visible', async ({ page }) => {
    await goTo(page, '/settings')
    await expect(page.getByRole('heading', { level: 2, name: '設定' })).toBeVisible()
    await expect(page.getByRole('button', { name: '淺色' })).toBeVisible()
    await expect(page.getByRole('button', { name: '深色' })).toBeVisible()
    await expect(page).toHaveScreenshot('settings.png', { fullPage: true })
  })
})

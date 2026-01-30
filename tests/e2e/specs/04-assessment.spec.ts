import { test, expect } from '../fixtures/setup'
import { goTo } from '../utils/navigation'

test.describe('Assessment Flow', () => {
  test('assessment entry and mini-cog selection available', async ({ page }) => {
    await goTo(page, '/assessment')
    await expect(page.getByRole('heading', { level: 1, name: '能力評估' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Mini-Cog|3 分鐘快評|開始/ })).toBeVisible()
    await expect(page).toHaveScreenshot('assessment-select.png', { fullPage: true, maxDiffPixelRatio: 0.05 })
  })
})

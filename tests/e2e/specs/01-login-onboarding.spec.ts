import { test, expect } from '../fixtures/setup'
import { goTo } from '../utils/navigation'

test.describe('Login & Onboarding', () => {
  test('login screen renders and submit disabled until valid', async ({ page }) => {
    await goTo(page, '/login')
    await expect(page.getByRole('heading', { name: '登入 / 註冊' })).toBeVisible()

    const submit = page.getByRole('button', { name: '開始訓練' })
    await expect(submit).toBeDisabled()

    await page.getByLabel('姓名').fill('測試使用者')
    await page.locator('#birthYear').fill('1955')
    await page.locator('#birthMonth').selectOption('5')
    await page.locator('#education').selectOption('12')
    await page.locator('#gender').selectOption('female')

    await expect(submit).toBeEnabled()
    await expect(page).toHaveScreenshot('login-filled.png', { fullPage: true, maxDiffPixelRatio: 0.05 })
  })

  test('onboarding basic flow buttons are present', async ({ page }) => {
    await goTo(page, '/onboarding')
    await expect(page.getByRole('button', { name: '開始設定' })).toBeVisible()
    await expect(page).toHaveScreenshot('onboarding-start.png', { fullPage: true })
  })
})

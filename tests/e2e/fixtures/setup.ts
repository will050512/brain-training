import { test as base } from '@playwright/test'
import { seedIndexedDB, seedLocalStorage } from './seed'

export const test = base.extend({
  page: async ({ page }, use) => {
    await seedLocalStorage(page)
    await seedIndexedDB(page)
    await use(page)
  },
})

export const expect = test.expect

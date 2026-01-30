import type { Page } from '@playwright/test'

const BASE_PATH_PREFIX = '/brain-training'

function ensureBasePath(path: string): string {
  if (path.startsWith('http')) {
    return path
  }

  if (path.startsWith(BASE_PATH_PREFIX)) {
    return path
  }

  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${BASE_PATH_PREFIX}${normalized}`
}

export async function goTo(page: Page, path: string): Promise<void> {
  await page.goto(ensureBasePath(path), { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
}

export async function assertNoClientError(page: Page): Promise<void> {
  const errors: string[] = []
  page.on('pageerror', error => {
    errors.push(error.message)
  })
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  await page.waitForTimeout(300)
  if (errors.length > 0) {
    throw new Error(`Client errors:\n${errors.join('\n')}`)
  }
}

import { expect, test } from '@playwright/test'

test.describe('Smoke tests – app loads without crashes', () => {
  test('renders the dashboard heading and main sections', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('heading', { level: 1, name: 'GbgGridlock' })).toBeVisible()

    expect(jsErrors).toEqual([])
  })

  test('no "Cannot access before initialization" errors in production build', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const initErrors = jsErrors.filter((msg) => msg.includes('before initialization'))
    expect(initErrors).toEqual([])
  })

  test('KPI cards section renders four cards', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const kpiCards = page.locator('[class*="kpi-card"]')
    await expect(kpiCards).toHaveCount(4)
  })

  test('mode filter buttons are present', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    for (const label of ['All', 'Tram', 'Bus']) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
    }
  })

  test('stop filter dropdown is present', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('#stop-filter')).toBeVisible()
  })
})

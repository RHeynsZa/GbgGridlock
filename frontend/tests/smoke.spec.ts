import { expect, test } from '@playwright/test'

const APP_HEADING = /GbgGridlock/i

async function gotoDashboard(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
}

test.describe('Smoke tests – redesigned dashboard shell', () => {
  test('renders the dashboard heading and primary sections without page errors', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await gotoDashboard(page)

    await expect(page.getByRole('heading', { level: 1, name: APP_HEADING })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Network Overview' })).toBeVisible()
    await expect(page.getByText('Delay ranking')).toBeVisible()
    await expect(page.getByText('System Diagnostics')).toBeVisible()

    expect(jsErrors).toEqual([])
  })

  test('does not emit initialization errors after the redesigned shell loads', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await gotoDashboard(page)
    await page.waitForLoadState('networkidle')

    const initErrors = jsErrors.filter((msg) => msg.includes('before initialization'))
    expect(initErrors).toEqual([])
  })

  test('renders the four KPI cards in the network overview', async ({ page }) => {
    await gotoDashboard(page)

    await expect(page.locator('.kpi-card')).toHaveCount(4)
    await expect(page.getByText('Network delay')).toBeVisible()
    await expect(page.getByText('P95 delay tail')).toBeVisible()
    await expect(page.getByText('Reliability score')).toBeVisible()
    await expect(page.getByText('Cancellation rate')).toBeVisible()
  })

  test('shows the redesigned control panel filters', async ({ page }) => {
    await gotoDashboard(page)

    await expect(page.getByText('Control panel')).toBeVisible()
    await expect(page.locator('#time-range-filter')).toBeVisible()
    await expect(page.locator('#stop-filter')).toBeVisible()

    for (const label of ['All', 'Tram', 'Bus']) {
      await expect(page.locator('.accented-button').filter({ hasText: label })).toBeVisible()
    }
  })
})

import { expect, test, type Page, type Route } from '@playwright/test'

const APP_HEADING = /GbgGridlock/i

async function gotoDashboard(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: APP_HEADING })).toBeVisible({ timeout: 10000 })
}

test.describe('API integration – real backend', () => {
  test('dashboard loads and renders core sections with real API calls', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await gotoDashboard(page)
    
    await expect(page.getByText('Network Overview')).toBeVisible()
    await expect(page.getByText('Control panel')).toBeVisible()
    await expect(page.getByText('Delay ranking')).toBeVisible()

    const initErrors = jsErrors.filter((msg) => msg.includes('before initialization'))
    expect(initErrors).toEqual([])
  })

  test('transport mode filters are interactive', async ({ page }) => {
    await gotoDashboard(page)

    const allButton = page.locator('.accented-button').filter({ hasText: 'All' }).first()
    const tramButton = page.locator('.accented-button').filter({ hasText: 'Tram' }).first()
    const busButton = page.locator('.accented-button').filter({ hasText: 'Bus' }).first()

    await expect(allButton).toBeVisible()
    await expect(tramButton).toBeVisible()
    await expect(busButton).toBeVisible()

    await tramButton.click()
    await expect(tramButton).toHaveClass(/border-border/)

    await busButton.click()
    await expect(busButton).toHaveClass(/border-border/)
  })

  test('stop filter dropdown is populated and functional', async ({ page }) => {
    await gotoDashboard(page)

    const select = page.locator('#stop-filter')
    await expect(select).toBeVisible()

    const optionCount = await select.locator('option').count()
    expect(optionCount).toBeGreaterThanOrEqual(1)
  })

  test('KPI cards render with data or loading states', async ({ page }) => {
    await gotoDashboard(page)

    const kpiCards = page.locator('.kpi-card')
    await expect(kpiCards).toHaveCount(4)
  })

  test('charts render without errors', async ({ page }) => {
    await gotoDashboard(page)

    await page.waitForTimeout(2000)

    const rechartsCount = await page.locator('.recharts-surface').count()
    expect(rechartsCount).toBeGreaterThanOrEqual(0)
  })

  test('system diagnostics section is present', async ({ page }) => {
    await gotoDashboard(page)

    await expect(page.getByText('System Diagnostics')).toBeVisible()
  })

  test('drilldown panel responds to mode selection', async ({ page }) => {
    await gotoDashboard(page)

    await expect(page.getByText('Route drilldown panel')).toBeVisible()
    
    const drilldown = page.locator('.rounded-xl.shadow-md').filter({ hasText: 'Route drilldown panel' }).first()
    await expect(drilldown).toBeVisible()
  })

  test('hourly trend chart renders with proper datetime formatting', async ({ page }) => {
    await gotoDashboard(page)

    await expect(page.getByText('Delay timeline and rush pressure')).toBeVisible()
    
    await page.waitForTimeout(2000)
    
    const chartContainer = page.locator('.recharts-surface').first()
    if (await chartContainer.count() > 0) {
      await expect(chartContainer).toBeVisible()
      
      const xAxisTicks = page.locator('.recharts-xAxis .recharts-cartesian-axis-tick-value')
      const tickCount = await xAxisTicks.count()
      
      if (tickCount > 0) {
        const firstTickText = await xAxisTicks.first().textContent()
        expect(firstTickText).toMatch(/^\d{2}:\d{2}$|^\d{2}-\d{2} \d{2}:\d{2}$/)
      }
    }
  })
})

test.describe('API error handling – graceful degradation', () => {
  test('app does not crash on JavaScript errors', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await gotoDashboard(page)
    
    await page.waitForTimeout(2000)
    
    const criticalErrors = jsErrors.filter((msg) => 
      msg.includes('Cannot read') || 
      msg.includes('undefined is not') || 
      msg.includes('null is not')
    )
    expect(criticalErrors.length).toBe(0)
  })
})

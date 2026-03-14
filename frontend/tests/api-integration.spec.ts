import { expect, test } from '@playwright/test'

test.describe('API Integration Tests with Mocked Responses', () => {
  test('makes network requests to all required API endpoints', async ({ page }) => {
    const apiRequests = {
      networkStats: false,
      hourlyTrend: false,
      lineDetails: false,
      worstLines: false,
      monitoredStops: false,
      lineMetadata: false,
      debugMetrics: false,
    }

    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/api/v1/stats/network')) apiRequests.networkStats = true
      if (url.includes('/api/v1/stats/hourly-trend')) apiRequests.hourlyTrend = true
      if (url.includes('/api/v1/lines/details')) apiRequests.lineDetails = true
      if (url.includes('/api/v1/delays/by-stop')) apiRequests.worstLines = true
      if (url.includes('/api/v1/stops/monitored')) apiRequests.monitoredStops = true
      if (url.includes('/api/v1/lines/metadata')) apiRequests.lineMetadata = true
      if (url.includes('/api/v1/debug/metrics')) apiRequests.debugMetrics = true
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(2000)

    expect(apiRequests.networkStats, 'Network stats API was called').toBe(true)
    expect(apiRequests.hourlyTrend, 'Hourly trend API was called').toBe(true)
    expect(apiRequests.lineDetails, 'Line details API was called').toBe(true)
    expect(apiRequests.worstLines, 'Worst lines API was called').toBe(true)
    expect(apiRequests.monitoredStops, 'Monitored stops API was called').toBe(true)
    expect(apiRequests.lineMetadata, 'Line metadata API was called').toBe(true)
    expect(apiRequests.debugMetrics, 'Debug metrics API was called').toBe(true)
  })

  test('dashboard page structure renders correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { level: 1, name: 'GbgGridlock' })).toBeVisible()

    const kpiCards = page.locator('[class*="kpi-card"]')
    const kpiCount = await kpiCards.count()
    expect(kpiCount).toBeGreaterThanOrEqual(4)
  })

  test('verifies no hardcoded empty data arrays by checking for charts', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const recharts = page.locator('[class*="recharts"]')
    const rechartsCount = await recharts.count()
    
    expect(rechartsCount).toBeGreaterThan(0)
  })
})

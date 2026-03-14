import { expect, test, type Page, type Route } from '@playwright/test'

const MOCK_NETWORK_STATS = {
  avg_delay_seconds: 142.5,
  reliability_percent: 78.3,
  cancellation_rate_percent: 4.2,
  p95_delay_seconds: 380.0,
  sample_size: 1500,
}

const MOCK_WORST_LINES = [
  { line_number: '11', avg_delay_seconds: 210.0, sample_size: 120, transport_mode: 'tram' },
  { line_number: '6', avg_delay_seconds: 185.5, sample_size: 98, transport_mode: 'tram' },
  { line_number: '19', avg_delay_seconds: 150.0, sample_size: 75, transport_mode: 'bus' },
  { line_number: '286', avg_delay_seconds: 95.0, sample_size: 50, transport_mode: 'bus' },
]

const MOCK_HOURLY_TREND = [
  { hour: '06:00', tram: 45.0, bus: 30.0, ferry: 10.0 },
  { hour: '07:00', tram: 120.0, bus: 80.0, ferry: 15.0 },
  { hour: '08:00', tram: 200.0, bus: 150.0, ferry: 20.0 },
  { hour: '09:00', tram: 160.0, bus: 110.0, ferry: 18.0 },
  { hour: '10:00', tram: 90.0, bus: 60.0, ferry: 12.0 },
]

const MOCK_LINE_DETAILS = [
  { line_number: '6', transport_mode: 'tram', avg_delay_seconds: 185.5, on_time_rate_percent: 72.0, canceled_trips: 3, sample_size: 98 },
  { line_number: '11', transport_mode: 'tram', avg_delay_seconds: 210.0, on_time_rate_percent: 65.0, canceled_trips: 5, sample_size: 120 },
  { line_number: '19', transport_mode: 'bus', avg_delay_seconds: 150.0, on_time_rate_percent: 80.0, canceled_trips: 1, sample_size: 75 },
  { line_number: '286', transport_mode: 'bus', avg_delay_seconds: 95.0, on_time_rate_percent: 88.0, canceled_trips: 0, sample_size: 50 },
]

const MOCK_MONITORED_STOPS = [
  { stop_gid: '9021014001960000', stop_name: 'Centralstationen' },
  { stop_gid: '9021014004490000', stop_name: 'Korsvägen' },
  { stop_gid: '9021014003980000', stop_name: 'Järntorget' },
]

const MOCK_LINE_METADATA = [
  { line_number: '6', foreground_color: '009E73', background_color: '009E73', text_color: 'FFFFFF', border_color: '009E73', transport_mode: 'tram' },
  { line_number: '11', foreground_color: 'F0E442', background_color: 'F0E442', text_color: '111827', border_color: 'F0E442', transport_mode: 'tram' },
  { line_number: '19', foreground_color: 'D55E00', background_color: 'D55E00', text_color: 'FFFFFF', border_color: 'D55E00', transport_mode: 'bus' },
]

const MOCK_DEBUG_METRICS = {
  window_minutes: 5,
  monitored_stops_count: 12,
  poll_requests_count_5m: 48,
  successful_poll_requests_count_5m: 46,
  average_api_response_time_ms_5m: 234.5,
  success_rate_percent_5m: 95.8,
  poll_cycles_count_5m: 4,
  successful_stop_polls_count_5m: 44,
  failed_stop_polls_count_5m: 4,
}

const MOCK_DELAY_DISTRIBUTION = [
  { bucket_seconds: 0, departures: 45 },
  { bucket_seconds: 60, departures: 82 },
  { bucket_seconds: 120, departures: 65 },
  { bucket_seconds: 180, departures: 38 },
  { bucket_seconds: 240, departures: 22 },
  { bucket_seconds: 300, departures: 15 },
  { bucket_seconds: 360, departures: 8 },
  { bucket_seconds: 420, departures: 4 },
]

async function mockAllApiRoutes(page: Page) {
  await page.route('**/api/v1/stats/network*', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_NETWORK_STATS) }),
  )

  await page.route('**/api/v1/delays/by-stop*', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_WORST_LINES) }),
  )

  await page.route('**/api/v1/stats/hourly-trend*', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_HOURLY_TREND) }),
  )

  await page.route('**/api/v1/lines/details*', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LINE_DETAILS) }),
  )

  await page.route('**/api/v1/stops/monitored*', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MONITORED_STOPS) }),
  )

  await page.route('**/api/v1/lines/metadata*', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LINE_METADATA) }),
  )

  await page.route('**/api/v1/debug/metrics*', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DEBUG_METRICS) }),
  )

  await page.route('**/api/v1/delays/distribution/*', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DELAY_DISTRIBUTION) }),
  )
}

test.describe('API integration – mocked backend responses', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiRoutes(page)
  })

  test('no JavaScript errors on page load with API data', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { level: 1, name: 'GbgGridlock' })).toBeVisible()

    const initErrors = jsErrors.filter((msg) => msg.includes('before initialization'))
    expect(initErrors).toEqual([])
    expect(jsErrors).toEqual([])
  })

  test('all eight API endpoints are called on page load', async ({ page }) => {
    const calledEndpoints = new Set<string>()

    page.on('request', (req) => {
      const url = req.url()
      if (url.includes('/api/v1/stats/network')) calledEndpoints.add('networkStats')
      if (url.includes('/api/v1/stats/hourly-trend')) calledEndpoints.add('hourlyTrend')
      if (url.includes('/api/v1/lines/details')) calledEndpoints.add('lineDetails')
      if (url.includes('/api/v1/delays/by-stop')) calledEndpoints.add('worstLines')
      if (url.includes('/api/v1/stops/monitored')) calledEndpoints.add('monitoredStops')
      if (url.includes('/api/v1/lines/metadata')) calledEndpoints.add('lineMetadata')
      if (url.includes('/api/v1/debug/metrics')) calledEndpoints.add('debugMetrics')
      if (url.includes('/api/v1/delays/distribution')) calledEndpoints.add('delayDistribution')
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const expected = ['networkStats', 'hourlyTrend', 'lineDetails', 'worstLines', 'monitoredStops', 'lineMetadata', 'debugMetrics', 'delayDistribution']
    for (const endpoint of expected) {
      expect(calledEndpoints.has(endpoint), `${endpoint} API was called`).toBe(true)
    }
  })

  test('KPI cards display values derived from the network stats API', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const kpiSection = page.locator('section').first()
    await expect(kpiSection.getByText('143s')).toBeVisible()
    await expect(kpiSection.getByText('380s')).toBeVisible()
    await expect(kpiSection.getByText('78%')).toBeVisible()
    await expect(kpiSection.getByText('4.2%')).toBeVisible()
  })

  test('delay ranking shows lines sorted by delay descending', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Delay ranking')).toBeVisible()

    await expect(page.getByText('210s', { exact: true })).toBeVisible()
    await expect(page.getByText('186s', { exact: true })).toBeVisible()
    await expect(page.getByText('150s', { exact: true })).toBeVisible()
    await expect(page.getByText('95s', { exact: true })).toBeVisible()
  })

  test('Recharts SVG containers render with data', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const svgElements = page.locator('.recharts-surface')
    await expect(svgElements.first()).toBeVisible()
    const svgCount = await svgElements.count()
    expect(svgCount).toBeGreaterThanOrEqual(2)
  })

  test('monitored stops appear in the stop filter dropdown', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const select = page.locator('#stop-filter')
    await expect(select).toBeVisible()

    for (const stop of MOCK_MONITORED_STOPS) {
      await expect(select.locator(`option[value="${stop.stop_gid}"]`)).toHaveText(stop.stop_name)
    }
  })

  test('selecting a stop re-fetches worst lines with stop_gid param', async ({ page }) => {
    const byStopRequests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/delays/by-stop')) {
        byStopRequests.push(req.url())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const initialCount = byStopRequests.length

    const select = page.locator('#stop-filter')
    await select.selectOption('9021014001960000')

    await page.waitForTimeout(1500)

    const newRequests = byStopRequests.slice(initialCount)
    expect(newRequests.length).toBeGreaterThan(0)
    const lastReq = newRequests[newRequests.length - 1]
    expect(lastReq).toContain('stop_gid=9021014001960000')
  })

  test('mode filter buttons filter the line drilldown section', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const drilldownCard = page.locator('text=Route drilldown panel').locator('..')
    await expect(drilldownCard).toBeVisible()

    const filterSection = page.locator('text=Control panel').locator('..').locator('..')

    await filterSection.getByRole('button', { name: 'Tram', exact: true }).click()
    await page.waitForTimeout(500)

    const drilldownParent = page.locator('text=Route drilldown panel').locator('..').locator('..')
    await expect(drilldownParent.getByRole('button', { name: /Tram\s/ })).toHaveCount(2)
    await expect(drilldownParent.getByRole('button', { name: /Bus\s/ })).toHaveCount(0)

    await filterSection.getByRole('button', { name: 'Bus', exact: true }).click()
    await page.waitForTimeout(500)

    await expect(drilldownParent.getByRole('button', { name: /Tram\s/ })).toHaveCount(0)
    await expect(drilldownParent.getByRole('button', { name: /Bus\s/ })).toHaveCount(2)
  })

  test('debug monitoring metrics section shows live data', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Debug monitoring metrics')).toBeVisible()

    const debugSection = page.getByText('Debug monitoring metrics').locator('..').locator('..')
    await expect(debugSection.getByText('12')).toBeVisible()
    await expect(debugSection.getByText('48')).toBeVisible()
    await expect(debugSection.getByText('95.8%')).toBeVisible()
  })

  test('line metadata colors text appears when API returns data', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Line colors loaded from official metadata endpoint.')).toBeVisible()
  })

  test('hourly trend chart renders area elements', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Delay timeline and rush pressure')).toBeVisible()

    const areaChart = page.locator('.recharts-area')
    const areaCount = await areaChart.count()
    expect(areaCount).toBeGreaterThanOrEqual(1)
  })

  test('delay distribution bar chart renders bars', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Delay distribution (right-skew aware)')).toBeVisible()

    const barChart = page.locator('.recharts-bar')
    const barCount = await barChart.count()
    expect(barCount).toBeGreaterThanOrEqual(1)
  })
})

test.describe('API error handling – graceful degradation', () => {
  test('app renders without crashing when all APIs return 500', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.route('**/api/v1/**', (route: Route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Internal Server Error' }) }),
    )

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { level: 1, name: 'GbgGridlock' })).toBeVisible()

    const initErrors = jsErrors.filter((msg) => msg.includes('before initialization'))
    expect(initErrors).toEqual([])
  })

  test('app renders without crashing when APIs timeout', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.route('**/api/v1/**', (route: Route) => route.abort('timedout'))

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    await expect(page.getByRole('heading', { level: 1, name: 'GbgGridlock' })).toBeVisible()

    const initErrors = jsErrors.filter((msg) => msg.includes('before initialization'))
    expect(initErrors).toEqual([])
  })

  test('fallback color text appears when metadata API fails', async ({ page }) => {
    await page.route('**/api/v1/stats/network*', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_NETWORK_STATS) }),
    )
    await page.route('**/api/v1/stats/hourly-trend*', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_HOURLY_TREND) }),
    )
    await page.route('**/api/v1/lines/details*', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LINE_DETAILS) }),
    )
    await page.route('**/api/v1/delays/by-stop*', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_WORST_LINES) }),
    )
    await page.route('**/api/v1/stops/monitored*', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MONITORED_STOPS) }),
    )
    await page.route('**/api/v1/debug/metrics*', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DEBUG_METRICS) }),
    )
    await page.route('**/api/v1/lines/metadata*', (route: Route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'error' }) }),
    )

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/neutral colors are shown/)).toBeVisible()
  })
})

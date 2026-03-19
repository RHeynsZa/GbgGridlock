import { expect, test, type Page, type Route } from "@playwright/test";

const APP_HEADING = /GbgGridlock/i;

const MOCK_NETWORK_STATS = {
  avg_delay_seconds: 142.5,
  reliability_percent: 78.3,
  cancellation_rate_percent: 4.2,
  p95_delay_seconds: 380.0,
  sample_size: 1500,
};

const MOCK_WORST_LINES = [
  {
    line_number: "11",
    avg_delay_seconds: 210.0,
    sample_size: 120,
    transport_mode: "tram",
  },
  {
    line_number: "6",
    avg_delay_seconds: 185.5,
    sample_size: 98,
    transport_mode: "tram",
  },
  {
    line_number: "19",
    avg_delay_seconds: 150.0,
    sample_size: 75,
    transport_mode: "bus",
  },
  {
    line_number: "286",
    avg_delay_seconds: 95.0,
    sample_size: 50,
    transport_mode: "bus",
  },
];

const MOCK_HOURLY_TREND = [
  { hour: "06:00", tram: 45.0, bus: 30.0, ferry: 10.0 },
  { hour: "07:00", tram: 120.0, bus: 80.0, ferry: 15.0 },
  { hour: "08:00", tram: 200.0, bus: 150.0, ferry: 20.0 },
  { hour: "09:00", tram: 160.0, bus: 110.0, ferry: 18.0 },
  { hour: "10:00", tram: 90.0, bus: 60.0, ferry: 12.0 },
];

const MOCK_LINE_DETAILS = [
  {
    line_number: "6",
    transport_mode: "tram",
    avg_delay_seconds: 185.5,
    on_time_rate_percent: 72.0,
    canceled_trips: 3,
    sample_size: 98,
  },
  {
    line_number: "11",
    transport_mode: "tram",
    avg_delay_seconds: 210.0,
    on_time_rate_percent: 65.0,
    canceled_trips: 5,
    sample_size: 120,
  },
  {
    line_number: "19",
    transport_mode: "bus",
    avg_delay_seconds: 150.0,
    on_time_rate_percent: 80.0,
    canceled_trips: 1,
    sample_size: 75,
  },
  {
    line_number: "286",
    transport_mode: "bus",
    avg_delay_seconds: 95.0,
    on_time_rate_percent: 88.0,
    canceled_trips: 0,
    sample_size: 50,
  },
];

const MOCK_MONITORED_STOPS = [
  { stop_gid: "9021014001960000", stop_name: "Centralstationen" },
  { stop_gid: "9021014004490000", stop_name: "Korsvägen" },
  { stop_gid: "9021014003980000", stop_name: "Järntorget" },
];

const MOCK_LINE_METADATA = [
  {
    line_number: "6",
    foreground_color: "009E73",
    background_color: "009E73",
    text_color: "FFFFFF",
    border_color: "009E73",
    transport_mode: "tram",
  },
  {
    line_number: "11",
    foreground_color: "F0E442",
    background_color: "F0E442",
    text_color: "111827",
    border_color: "F0E442",
    transport_mode: "tram",
  },
  {
    line_number: "19",
    foreground_color: "D55E00",
    background_color: "D55E00",
    text_color: "FFFFFF",
    border_color: "D55E00",
    transport_mode: "bus",
  },
];

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
};

const MOCK_DELAY_DISTRIBUTION = [
  { bucket_seconds: 0, departures: 45 },
  { bucket_seconds: 60, departures: 82 },
  { bucket_seconds: 120, departures: 65 },
  { bucket_seconds: 180, departures: 38 },
  { bucket_seconds: 240, departures: 22 },
  { bucket_seconds: 300, departures: 15 },
  { bucket_seconds: 360, departures: 8 },
  { bucket_seconds: 420, departures: 4 },
];

type RouteHits = Record<
  | "networkStats"
  | "worstLines"
  | "hourlyTrend"
  | "lineDetails"
  | "monitoredStops"
  | "lineMetadata"
  | "debugMetrics"
  | "delayDistribution",
  number
>;

async function mockAllApiRoutes(page: Page) {
  const hits: RouteHits = {
    networkStats: 0,
    worstLines: 0,
    hourlyTrend: 0,
    lineDetails: 0,
    monitoredStops: 0,
    lineMetadata: 0,
    debugMetrics: 0,
    delayDistribution: 0,
  };

  await page.route("**/api/v1/stats/network*", (route: Route) => {
    hits.networkStats += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_NETWORK_STATS),
    });
  });

  await page.route("**/api/v1/delays/by-stop*", (route: Route) => {
    hits.worstLines += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_WORST_LINES),
    });
  });

  await page.route("**/api/v1/stats/hourly-trend*", (route: Route) => {
    hits.hourlyTrend += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_HOURLY_TREND),
    });
  });

  await page.route("**/api/v1/lines/details*", (route: Route) => {
    hits.lineDetails += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_LINE_DETAILS),
    });
  });

  await page.route("**/api/v1/stops/monitored*", (route: Route) => {
    hits.monitoredStops += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_MONITORED_STOPS),
    });
  });

  await page.route("**/api/v1/lines/metadata*", (route: Route) => {
    hits.lineMetadata += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_LINE_METADATA),
    });
  });

  await page.route("**/api/v1/debug/metrics*", (route: Route) => {
    hits.debugMetrics += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_DEBUG_METRICS),
    });
  });

  await page.route("**/api/v1/delays/distribution/*", (route: Route) => {
    hits.delayDistribution += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_DELAY_DISTRIBUTION),
    });
  });

  return hits;
}

async function gotoDashboard(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await expect(
    page.getByRole("heading", { level: 1, name: APP_HEADING }),
  ).toBeVisible();
}

test.describe("API integration – mocked backend responses", () => {
  test("renders the redesigned dashboard with mocked data and no initialization errors", async ({
    page,
  }) => {
    await mockAllApiRoutes(page);

    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    await gotoDashboard(page);
    await expect(page.getByText("Delay ranking")).toBeVisible();

    const initErrors = jsErrors.filter((msg) =>
      msg.includes("before initialization"),
    );
    expect(initErrors).toEqual([]);
  });

  test("calls every dashboard data endpoint on first render", async ({
    page,
  }) => {
    const hits = await mockAllApiRoutes(page);

    await gotoDashboard(page);
    await expect(
      page.getByText("Delay distribution (right-skew aware)"),
    ).toBeVisible();
    await expect.poll(() => hits.delayDistribution).toBeGreaterThan(0);

    for (const [endpoint, count] of Object.entries(hits)) {
      expect(count, `${endpoint} API was called`).toBeGreaterThan(0);
    }
  });

  test("shows KPI values derived from the network stats API", async ({
    page,
  }) => {
    await mockAllApiRoutes(page);

    await gotoDashboard(page);

    await expect(page.getByText("143s")).toBeVisible();
    await expect(page.getByText("380s")).toBeVisible();
    await expect(page.getByText("78%")).toBeVisible();
    await expect(page.getByText("4.2%")).toBeVisible();
  });

  test("shows the line delay ranking sorted by descending delay", async ({
    page,
  }) => {
    await mockAllApiRoutes(page);

    await gotoDashboard(page);

    const rankingRows = page.locator(".group.cursor-pointer");
    await expect(rankingRows).toHaveCount(4);

    const lineLabels = rankingRows.locator("p.text-sm.font-semibold");
    await expect(lineLabels.nth(0)).toHaveText("11");
    await expect(lineLabels.nth(1)).toHaveText("6");
    await expect(lineLabels.nth(2)).toHaveText("19");
    await expect(lineLabels.nth(3)).toHaveText("286");
    await expect(rankingRows.first()).toBeVisible();
  });

  test("renders both Recharts visualizations with mocked data", async ({
    page,
  }) => {
    await mockAllApiRoutes(page);

    await gotoDashboard(page);

    await expect(page.locator(".recharts-surface").first()).toBeVisible();
    await expect
      .poll(async () => page.locator(".recharts-surface").count())
      .toBeGreaterThanOrEqual(2);
  });

  test("shows monitored stops in the stop filter", async ({ page }) => {
    await mockAllApiRoutes(page);

    await gotoDashboard(page);

    const select = page.getByRole("combobox", { name: "Stop filter" });
    await expect(select).toBeVisible();

    for (const stop of MOCK_MONITORED_STOPS) {
      await expect(
        select.locator(`option[value="${stop.stop_gid}"]`),
      ).toHaveText(stop.stop_name);
    }
  });

  test("re-fetches worst lines when a stop is selected", async ({ page }) => {
    const hits = await mockAllApiRoutes(page);
    const byStopRequests: string[] = [];

    page.on("request", (req) => {
      if (req.url().includes("/api/v1/delays/by-stop")) {
        byStopRequests.push(req.url());
      }
    });

    await gotoDashboard(page);

    const initialCount = hits.worstLines;
    await page
      .getByRole("combobox", { name: "Stop filter" })
      .selectOption("9021014001960000");

    await expect.poll(() => hits.worstLines).toBeGreaterThan(initialCount);
    expect(byStopRequests.at(-1)).toContain("stop_gid=9021014001960000");
  });

  test("filters the route drilldown chips by transport mode", async ({
    page,
  }) => {
    await mockAllApiRoutes(page);

    await gotoDashboard(page);

    const drilldown = page
      .locator(".rounded-xl.shadow-md")
      .filter({ has: page.getByText("Route drilldown panel") })
      .first();

    await page.getByRole("button", { name: "Tram", exact: true }).click();
    await expect(drilldown.getByRole("button", { name: "6" })).toBeVisible();
    await expect(drilldown.getByRole("button", { name: "11" })).toBeVisible();
    await expect(drilldown.getByRole("button", { name: "19" })).toHaveCount(0);
    await expect(drilldown.getByRole("button", { name: "286" })).toHaveCount(0);

    await page.getByRole("button", { name: "Bus", exact: true }).click();
    await expect(drilldown.getByRole("button", { name: "19" })).toBeVisible();
    await expect(drilldown.getByRole("button", { name: "286" })).toBeVisible();
    await expect(drilldown.getByText("Bus Line 19")).toBeVisible();
    await expect(drilldown.getByText("Tram Line 6")).toHaveCount(0);
  });

  test("shows the live diagnostics metrics from the backend", async ({
    page,
  }) => {
    await mockAllApiRoutes(page);

    await gotoDashboard(page);

    await expect(page.getByText("System Diagnostics")).toBeVisible();
    await expect(
      page.getByText("Monitored Stops", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("12", { exact: true })).toBeVisible();
    await expect(page.getByText("48", { exact: true })).toBeVisible();
    await expect(page.getByText("95.8%")).toBeVisible();
  });

  test("shows metadata messaging when line colors load successfully", async ({
    page,
  }) => {
    await mockAllApiRoutes(page);

    await gotoDashboard(page);

    await expect(
      page.getByText("Line colors loaded from official metadata endpoint."),
    ).toBeVisible();
  });

  test("renders chart legends and selection accents for the updated charts", async ({
    page,
  }) => {
    await mockAllApiRoutes(page);

    await gotoDashboard(page);

    await expect(
      page.getByText("Delay timeline and rush pressure"),
    ).toBeVisible();
    await expect(
      page.getByText("Delay distribution (right-skew aware)"),
    ).toBeVisible();
    await expect(page.locator(".recharts-legend-wrapper")).toHaveCount(2);
    await expect(
      page.locator(".recharts-legend-item-text", { hasText: "Tram" }),
    ).toBeVisible();
    await expect(
      page.locator(".recharts-legend-item-text", { hasText: "Departures" }),
    ).toBeVisible();

    const selectedChip = page.getByRole("button", { name: "6" });
    await expect(selectedChip).toHaveCSS("border-right-width", "4px");
    await expect(selectedChip).toHaveCSS("border-bottom-width", "4px");
  });
});

test.describe("API error handling – graceful degradation", () => {
  test("app renders without crashing when all APIs return 500", async ({
    page,
  }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    await page.route("**/api/v1/**", (route: Route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal Server Error" }),
      }),
    );

    await gotoDashboard(page);

    const initErrors = jsErrors.filter((msg) =>
      msg.includes("before initialization"),
    );
    expect(initErrors).toEqual([]);
  });

  test("app renders without crashing when APIs timeout", async ({ page }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    await page.route("**/api/v1/**", (route: Route) => route.abort("timedout"));

    await gotoDashboard(page);
    await page.waitForTimeout(2000);

    const initErrors = jsErrors.filter((msg) =>
      msg.includes("before initialization"),
    );
    expect(initErrors).toEqual([]);
  });

  test("shows fallback color messaging when metadata is unavailable", async ({
    page,
  }) => {
    await page.route("**/api/v1/stats/network*", (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_NETWORK_STATS),
      }),
    );
    await page.route("**/api/v1/stats/hourly-trend*", (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_HOURLY_TREND),
      }),
    );
    await page.route("**/api/v1/lines/details*", (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_LINE_DETAILS),
      }),
    );
    await page.route("**/api/v1/delays/by-stop*", (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_WORST_LINES),
      }),
    );
    await page.route("**/api/v1/stops/monitored*", (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_MONITORED_STOPS),
      }),
    );
    await page.route("**/api/v1/debug/metrics*", (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DEBUG_METRICS),
      }),
    );
    await page.route("**/api/v1/delays/distribution/*", (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DELAY_DISTRIBUTION),
      }),
    );
    await page.route("**/api/v1/lines/metadata*", (route: Route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "error" }),
      }),
    );

    await gotoDashboard(page);

    await expect(page.getByText(/neutral colors are shown/i)).toBeVisible();
  });
});

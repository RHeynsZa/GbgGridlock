import { expect, test } from '@playwright/test'

test('renders dashboard shell content', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'GbgGridlock' })).toBeVisible()
  await expect(page.getByText('System Health Indicator')).toBeVisible()
  await expect(page.getByText('Wall of Shame')).toBeVisible()
})

import { expect, test } from '@playwright/test'

test('renders dashboard shell content', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'GbgGridlock' })).toBeVisible()
  await expect(page.getByText('Delay ranking')).toBeVisible()
  await expect(page.getByText('Delay distribution (right-skew aware)')).toBeVisible()
})

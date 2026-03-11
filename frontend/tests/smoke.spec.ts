import { expect, test } from '@playwright/test'

test('renders dashboard shell content', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Västtrafik Pulse Dashboard' })).toBeVisible()
  await expect(page.getByText('Line delay ranking')).toBeVisible()
  await expect(page.getByText('Modal delay contribution')).toBeVisible()
})

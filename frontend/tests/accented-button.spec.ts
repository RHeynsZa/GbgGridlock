import { expect, test } from '@playwright/test'

test.describe('AccentedButton Component', () => {
  test('should render accented buttons on demo page', async ({ page }) => {
    await page.goto('/button-demo')

    await expect(page.getByRole('heading', { name: 'AccentedButton Component Demo' })).toBeVisible()

    const buttons = page.locator('.accented-button')
    await expect(buttons.first()).toBeVisible()

    const firstButton = buttons.first()
    await expect(firstButton).toBeEnabled()
    await expect(firstButton).toHaveCSS('cursor', 'pointer')
  })

  test('should render buttons with different variants', async ({ page }) => {
    await page.goto('/button-demo')

    await expect(page.getByText('Default Variant')).toBeVisible()
    await expect(page.getByText('Outline Variant')).toBeVisible()
    await expect(page.getByText('Ghost Variant')).toBeVisible()
  })

  test('should show all size variations', async ({ page }) => {
    await page.goto('/button-demo')

    await expect(page.getByRole('button', { name: 'Small' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Medium' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Large' })).toBeVisible()
  })

  test('should render disabled state correctly', async ({ page }) => {
    await page.goto('/button-demo')

    const disabledButton = page.getByRole('button', { name: 'Disabled' })
    await expect(disabledButton).toBeVisible()
    await expect(disabledButton).toBeDisabled()
  })

  test('should have visible accent line on all buttons', async ({ page }) => {
    await page.goto('/button-demo')

    const buttons = page.locator('.accented-button')
    const count = await buttons.count()

    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i)
      const accentLine = button.locator('span.absolute.bottom-0')
      await expect(accentLine).toBeVisible()

      const bgColor = await accentLine.evaluate((el) => window.getComputedStyle(el).backgroundColor)
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)')
      expect(bgColor).not.toBe('transparent')
    }
  })

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/button-demo')

    const firstButton = page.locator('.accented-button').first()
    await firstButton.focus()

    const ringStyles = await firstButton.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
      }
    })

    expect(ringStyles.outline !== 'none' || ringStyles.outlineWidth !== '0px').toBeTruthy()
  })

  test('should integrate with dashboard transport mode filters', async ({ page }) => {
    await page.goto('/')

    const transportModeButtons = page.getByRole('button', { name: /Tram|Bus|Ferry/i })
    const firstModeButton = transportModeButtons.first()

    await expect(firstModeButton).toBeVisible()

    const accentLine = firstModeButton.locator('span.absolute.bottom-0')
    await expect(accentLine).toBeVisible()
  })
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('Fig. 1 can be stepped through with the keyboard alone', async ({ page }) => {
  await page.goto('/')
  const figure = page.locator('#fig-1')
  await figure.getByRole('button', { name: 'Next step' }).focus()
  for (let step = 0; step < 5; step += 1) await page.keyboard.press('Enter')
  await expect(figure).toContainText('201 · WAITLISTED #1')
  await expect(figure.getByRole('button', { name: /^t₅, step 5/ })).toHaveAttribute(
    'aria-current',
    'step',
  )
})

test('under reduced motion Run shows the final state immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('#fig-1').getByRole('button', { name: 'Run the sequence' }).click()
  await expect(page.locator('#fig-1')).toContainText('Both answers are final')
})

test('the Lab contrasts the naive baseline with EventCore from recorded data', async ({ page }) => {
  await page.goto('/lab?scenario=rush')
  await expect(page.getByRole('link', { name: /Naive baseline/ })).toContainText(
    'invariants broken',
  )
  await expect(page.locator('a[href*="variant=locked"]')).toContainText('10 / 10 seats')
  await expect(page.getByText('Overbooked', { exact: true })).toBeVisible()
})

for (const path of [
  '/',
  '/explore',
  '/lab',
  '/architecture',
  '/events/northwind-assembly/the-last-seat',
]) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze()
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    )
    expect(serious.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([])
  })
}

test('no page scrolls sideways on a 360 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  for (const path of ['/', '/explore', '/lab', '/architecture']) {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
})

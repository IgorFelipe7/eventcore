import { type Page, expect } from '@playwright/test'

export const actAs = async (page: Page, persona: string) => {
  await page.locator('header summary').click()
  await page.getByRole('button', { name: new RegExp(`^${persona} \\(`) }).click()
  await expect(page.locator('header summary')).toContainText(persona)
}

export const openLastSeat = (page: Page) => page.goto('/events/northwind-assembly/the-last-seat')

import { expect, test } from '@playwright/test'
import { actAs, openLastSeat } from './support'

test.describe.configure({ mode: 'serial' })

test('the last seat goes to one participant, the next one queues, and a cancellation promotes them', async ({
  page,
}) => {
  await openLastSeat(page)
  await actAs(page, 'Sol')

  await page.getByRole('button', { name: 'Reserve a seat' }).click()
  const receipt = page.getByRole('status').filter({ hasText: 'New decision' })
  await expect(receipt).toContainText('Confirmed')
  await expect(receipt).toContainText('held by the database')

  await page.getByRole('button', { name: /Resend the exact same request/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Replayed answer' })).toContainText(
    'Nothing was booked twice',
  )

  await actAs(page, 'Ivo')
  await page.getByRole('button', { name: 'Reserve a seat' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'New decision' })).toContainText(
    'Waitlisted #1',
  )

  await actAs(page, 'Sol')
  await page.goto('/me/registrations')
  const lastSeat = page.getByRole('listitem').filter({ hasText: 'The Last Seat' })
  await lastSeat.getByRole('button', { name: 'Cancel registration' }).click()
  await expect(lastSeat.getByRole('status')).toContainText('next person in line was promoted')

  await actAs(page, 'Ivo')
  await page.goto('/me/registrations')
  const promoted = page.getByRole('listitem').filter({ hasText: 'The Last Seat' })
  await expect(promoted).toContainText('Confirmed')
  await expect(promoted).toContainText('Promoted from the waitlist')
})

test('organizers see only their organizations and cannot cross into another', async ({ page }) => {
  await page.goto('/dashboard')
  await actAs(page, 'Lis')
  await expect(page.getByRole('heading', { name: 'Harbor Guild' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Northwind Assembly' })).toHaveCount(0)
})

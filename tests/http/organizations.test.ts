import { type App } from '@eventcore/api'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { bearer, createTestApi } from '../support/api'
import { type TestDatabase, addMember, createTestDatabase, createUsers } from '../support/database'

const day = 86_400_000
const schedule = () => {
  const now = Date.now()
  return {
    enrollmentOpensAt: new Date(now - day).toISOString(),
    enrollmentClosesAt: new Date(now + 10 * day).toISOString(),
    startsAt: new Date(now + 11 * day).toISOString(),
  }
}

describe('organizer workflows', () => {
  let database: TestDatabase
  let api: App

  beforeAll(async () => {
    database = await createTestDatabase()
    api = await createTestApi(database)
  })

  afterAll(async () => {
    await api.close()
    await database.close()
  })

  const createOrganization = async (
    user: { subject: string; displayName: string },
    slug: string,
  ) => {
    const response = await api.inject({
      method: 'POST',
      url: '/v1/organizations',
      headers: await bearer(user),
      payload: { slug, name: `Org ${slug}` },
    })
    return response
  }

  it('creates an organization, a draft event, publishes it and exposes it publicly', async () => {
    const [admin] = await createUsers(database, 1)
    const organization = await createOrganization(admin, 'workflow-org')
    expect(organization.statusCode).toBe(201)
    const organizationId = organization.json().organization.id as string

    const created = await api.inject({
      method: 'POST',
      url: `/v1/organizations/${organizationId}/events`,
      headers: await bearer(admin),
      payload: {
        slug: 'launch-night',
        name: 'Launch Night',
        venue: 'Hall A',
        capacity: 50,
        ...schedule(),
      },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json()).toMatchObject({
      status: 'DRAFT',
      allowedTransitions: ['PUBLISHED', 'CANCELLED'],
      inventory: { capacity: 50, confirmed: 0, available: 50, waitlisted: 0 },
    })
    const eventId = created.json().id as string

    expect((await api.inject({ method: 'GET', url: `/v1/events/${eventId}` })).statusCode).toBe(404)

    const published = await api.inject({
      method: 'POST',
      url: `/v1/organizations/${organizationId}/events/${eventId}/status`,
      headers: await bearer(admin),
      payload: { status: 'PUBLISHED' },
    })
    expect(published.json().status).toBe('PUBLISHED')

    const publicView = await api.inject({
      method: 'GET',
      url: '/v1/events/by-slug/workflow-org/launch-night',
    })
    expect(publicView.statusCode).toBe(200)
    expect(publicView.json().id).toBe(eventId)
  })

  it('refuses duplicate slugs with SLUG_TAKEN', async () => {
    const [first, second] = await createUsers(database, 2)
    await createOrganization(first, 'taken-slug')
    const duplicate = await createOrganization(second, 'taken-slug')
    expect(duplicate.statusCode).toBe(409)
    expect(duplicate.json().code).toBe('SLUG_TAKEN')
  })

  it('validates the enrollment window through the domain', async () => {
    const [admin] = await createUsers(database, 1)
    const organizationId = (await createOrganization(admin, 'window-org')).json().organization.id
    const { startsAt, enrollmentOpensAt } = schedule()

    const response = await api.inject({
      method: 'POST',
      url: `/v1/organizations/${organizationId}/events`,
      headers: await bearer(admin),
      payload: {
        slug: 'bad-window',
        name: 'Bad window',
        venue: 'Hall',
        capacity: 10,
        startsAt,
        enrollmentOpensAt,
        enrollmentClosesAt: new Date(Date.parse(startsAt) + day).toISOString(),
      },
    })
    expect(response.statusCode).toBe(422)
    expect(response.json().code).toBe('INVALID_ENROLLMENT_WINDOW')
  })

  it('lets organizers publish but keeps cancellation with admins', async () => {
    const [admin, organizer] = await createUsers(database, 2)
    const organizationId = (await createOrganization(admin, 'roles-org')).json().organization.id
    await addMember(database, organizationId, organizer.id, 'ORGANIZER')

    const eventId = (
      await api.inject({
        method: 'POST',
        url: `/v1/organizations/${organizationId}/events`,
        headers: await bearer(organizer),
        payload: {
          slug: 'roles-event',
          name: 'Roles event',
          venue: 'Hall',
          capacity: 5,
          ...schedule(),
        },
      })
    ).json().id

    const transition = async (status: string) =>
      api.inject({
        method: 'POST',
        url: `/v1/organizations/${organizationId}/events/${eventId}/status`,
        headers: await bearer(organizer),
        payload: { status },
      })

    expect((await transition('PUBLISHED')).statusCode).toBe(200)
    const cancel = await transition('CANCELLED')
    expect(cancel.statusCode).toBe(403)
    expect(cancel.json().code).toBe('INSUFFICIENT_ROLE')
    const backwards = await transition('DRAFT')
    expect(backwards.statusCode).toBe(409)
    expect(backwards.json().code).toBe('INVALID_EVENT_TRANSITION')
  })

  it('patches metadata and reports a clean integrity check', async () => {
    const [admin] = await createUsers(database, 1)
    const organizationId = (await createOrganization(admin, 'patch-org')).json().organization.id
    const eventId = (
      await api.inject({
        method: 'POST',
        url: `/v1/organizations/${organizationId}/events`,
        headers: await bearer(admin),
        payload: {
          slug: 'patch-event',
          name: 'Patch event',
          venue: 'Hall',
          capacity: 5,
          ...schedule(),
        },
      })
    ).json().id

    const patched = await api.inject({
      method: 'PATCH',
      url: `/v1/organizations/${organizationId}/events/${eventId}`,
      headers: await bearer(admin),
      payload: { venue: 'Hall B', waitlistEnabled: false },
    })
    expect(patched.json()).toMatchObject({ venue: 'Hall B', waitlistEnabled: false })

    const integrity = await api.inject({
      method: 'GET',
      url: `/v1/organizations/${organizationId}/integrity`,
      headers: await bearer(admin),
    })
    expect(integrity.json()).toMatchObject({ violations: 0 })
  })
})

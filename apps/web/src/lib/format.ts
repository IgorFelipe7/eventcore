import { publicConfig } from './public-config'

const zone = publicConfig.displayTimeZone

const dateTime = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: zone,
  timeZoneName: 'short',
})

const dayMonth = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: zone,
})
const clock = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: zone,
})
const preciseClock = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  hour12: false,
  timeZone: zone,
})

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))
export const formatDayMonth = (iso: string) => dayMonth.format(new Date(iso)).toUpperCase()
export const formatClock = (iso: string) => clock.format(new Date(iso))
export const formatSnapshot = (iso: string) => preciseClock.format(new Date(iso))

export const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count.toLocaleString('en-US')} ${count === 1 ? singular : pluralForm}`

export const shortId = (id: string) => id.slice(-6)

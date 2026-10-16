import { type LabReplay, LabReplaySchema } from '@eventcore/contracts'
import { type Locale } from '@/i18n/locales'
import cancellationRace from '@/lab/replays/cancellation-race.json'
import capacityRace from '@/lab/replays/capacity-race.json'
import crossTenant from '@/lab/replays/cross-tenant.json'
import doubleClick from '@/lab/replays/double-click.json'
import lastSeat from '@/lab/replays/last-seat.json'
import lostResponse from '@/lab/replays/lost-response.json'
import providerOutage from '@/lab/replays/provider-outage.json'
import rush from '@/lab/replays/rush.json'
import { localizeReplay } from './replay-text'

export const REPLAYS: readonly LabReplay[] = [
  lastSeat,
  rush,
  doubleClick,
  lostResponse,
  cancellationRace,
  capacityRace,
  crossTenant,
  providerOutage,
]
  .map((replay) => LabReplaySchema.parse(replay))
  .sort((a, b) => a.order - b.order)

export const findReplay = (id: string | undefined): LabReplay =>
  REPLAYS.find((replay) => replay.id === id) ?? (REPLAYS[0] as LabReplay)

export const rushReplay = () => findReplay('rush')

export const replayPasses = (replay: LabReplay) =>
  replay.variants
    .filter((variant) => variant.safe)
    .every((variant) => variant.checks.every((check) => check.passed))

export const replaysIn = (locale: Locale) => REPLAYS.map((replay) => localizeReplay(replay, locale))

export const findReplayIn = (id: string | undefined, locale: Locale) =>
  localizeReplay(findReplay(id), locale)

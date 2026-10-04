import { type Inventory, type ProblemCode } from '@eventcore/contracts'
import { type RegistrationStatus } from '@eventcore/domain'

export type CommandState =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'registered'
      readonly key: string
      readonly registrationId: string
      readonly status: RegistrationStatus
      readonly transition: 'CREATED' | 'REENTERED' | 'UNCHANGED'
      readonly waitlistPosition: number | null
      readonly inventory: Inventory
      readonly replayed: boolean
      readonly requestId: string
      readonly answeredRequestId: string | null
    }
  | {
      readonly kind: 'cancelled'
      readonly key: string
      readonly transition: 'CANCELLED' | 'UNCHANGED'
      readonly promoted: boolean
      readonly replayed: boolean
      readonly requestId: string
    }
  | {
      readonly kind: 'problem'
      readonly key: string
      readonly code: ProblemCode
      readonly title: string
      readonly detail: string | null
      readonly retryable: boolean
      readonly requestId: string
    }
  | { readonly kind: 'unavailable'; readonly key: string }
  | { readonly kind: 'needs-persona' }

export const IDLE: CommandState = { kind: 'idle' }
